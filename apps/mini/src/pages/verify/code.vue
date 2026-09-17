<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { onHide, onShow, onUnload } from '@dcloudio/uni-app';
import { api } from '@/api';
import { fenToYuan } from '@/utils/request';
import { useUserStore } from '@/stores/user';
import { useShopStore } from '@/stores/shop';
import { drawQrCode } from '@/utils/qrcode';
import { formatCardNo } from '@/utils/card';
import { cardTypeLabel } from '@/utils/booking-ui';
import { useShopTheme } from '@/hooks/useShopTheme';

const user = useUserStore();
const shopStore = useShopStore();
const { pageStyleStr } = useShopTheme();
const code = ref('');
const cards = ref<any[]>([]);
const selectedCardId = ref<number | null>(null);
const selectedCard = ref<any>(null);
const countdown = ref(0);
const loadingCards = ref(true);
const showPicker = ref(false);
const keyword = ref('');
const QR_CANVAS_ID = 'verifyQr';
const QR_SIZE = 220;

let timer: ReturnType<typeof setInterval> | null = null;
let active = false;
let fetching = false;

const canVerify = computed(() => cards.value.length > 0 && selectedCardId.value);

const currentCard = computed(() => {
  if (!selectedCardId.value) return null;
  return cards.value.find((item) => item.id === selectedCardId.value) || selectedCard.value;
});

const filteredCards = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  if (!text) return cards.value;
  return cards.value.filter((item) => {
    const no = (item.cardNo || formatCardNo(item.id)).toLowerCase();
    const name = String(item.name || '').toLowerCase();
    const typeName = String(item.typeName || cardTypeLabel(item)).toLowerCase();
    return no.includes(text) || name.includes(text) || typeName.includes(text);
  });
});

function cardBalanceText(item: any) {
  if (item.deductMode === 'times') return `剩余 ${item.remainTimes} 次`;
  if (item.deductMode === 'period') return '周期有效';
  return `余额 ¥${fenToYuan(item.balance)}`;
}

function cardSummary(item: any) {
  return `${cardTypeLabel(item)} · ${cardBalanceText(item)}`;
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer() {
  stopTimer();
  if (!active) return;
  timer = setInterval(() => {
    if (!active) {
      stopTimer();
      return;
    }
    countdown.value -= 1;
    if (countdown.value <= 0) {
      void fetchCode();
    }
  }, 1000);
}

async function renderQr() {
  if (!code.value) return;
  await nextTick();
  drawQrCode(QR_CANVAS_ID, code.value, QR_SIZE);
}

async function loadCards() {
  loadingCards.value = true;
  try {
    const ok = await user.ensureLogin();
    if (!ok) {
      cards.value = [];
      selectedCardId.value = null;
      selectedCard.value = null;
      code.value = '';
      return;
    }
    const cardList = (await api.myCards()) as any[];
    cards.value = cardList || [];
    if (!cards.value.length) {
      selectedCardId.value = null;
      selectedCard.value = null;
      code.value = '';
      return;
    }
    const exists = cards.value.some((item) => item.id === selectedCardId.value);
    if (!exists) {
      selectedCardId.value = cards.value[0].id;
    }
    if (active && selectedCardId.value) {
      await fetchCode();
    }
  } finally {
    loadingCards.value = false;
  }
}

async function fetchCode() {
  if (!active || fetching || !selectedCardId.value) return;
  fetching = true;
  try {
    const data: any = await api.verifyCode(selectedCardId.value);
    if (!active) return;
    code.value = data.code;
    selectedCard.value = {
      ...cards.value.find((item) => item.id === selectedCardId.value),
      cardNo: data.cardNo,
      cardName: data.cardName,
      typeName: data.typeName,
    };
    countdown.value = data.expiresIn ?? 60;
    await renderQr();
    startTimer();
  } finally {
    fetching = false;
  }
}

function openPicker() {
  keyword.value = '';
  showPicker.value = true;
}

function closePicker() {
  showPicker.value = false;
  keyword.value = '';
}

function selectCard(cardId: number) {
  closePicker();
  if (selectedCardId.value === cardId) return;
  selectedCardId.value = cardId;
  void fetchCode();
}

function copyCode() {
  if (!code.value) return;
  uni.setClipboardData({
    data: code.value,
    success: () => uni.showToast({ title: '数字码已复制', icon: 'success' }),
  });
}

async function activate() {
  active = true;
  void shopStore.ensureShop();
  await loadCards();
}

async function handleLogin() {
  const ok = await user.login();
  if (ok) await loadCards();
}

function deactivate() {
  active = false;
  fetching = false;
  showPicker.value = false;
  stopTimer();
}

onShow(activate);
onHide(deactivate);
onUnload(deactivate);
</script>

<template>
  <page-meta :page-style="pageStyleStr" />
  <shop-theme-root>
  <view class="page">
    <view class="picker-bar">
      <view class="picker-bar__head">
        <text class="picker-bar__title">核销会员卡</text>
        <text v-if="cards.length" class="picker-bar__count">共 {{ cards.length }} 张</text>
      </view>

      <wd-skeleton v-if="loadingCards" :row-col="[{ width: '100%', height: '96rpx' }]" animation="gradient" />

      <empty-tip v-else-if="!user.isLoggedIn" icon="👤" tip="登录后出示核销码">
        <template #bottom>
          <theme-button round @click="handleLogin">立即登录</theme-button>
        </template>
      </empty-tip>

      <empty-tip v-else-if="!cards.length" icon="💳" tip="暂无可用会员卡" />

      <view v-else class="picker-bar__current" @click="openPicker">
        <view class="picker-bar__info">
          <text class="picker-bar__name">{{ currentCard?.name || '请选择会员卡' }}</text>
          <text v-if="currentCard" class="picker-bar__meta">
            {{ currentCard.cardNo || formatCardNo(currentCard.id) }} · {{ cardSummary(currentCard) }}
          </text>
        </view>
        <view class="picker-bar__action">
          <text>{{ cards.length > 1 ? '更换' : '查看' }}</text>
          <wd-icon name="arrow-right" size="28rpx" color="#c9a66b" />
        </view>
      </view>
    </view>

    <view v-if="canVerify" class="code-card">
      <text class="section-title">扫码核销</text>
      <text class="section-desc">店员在「店员端 → 扫码核销」扫描下方二维码</text>
      <view class="qr-wrap">
        <canvas :canvas-id="QR_CANVAS_ID" :id="QR_CANVAS_ID" class="qr-canvas" />
      </view>
      <text class="code-hint">{{ countdown > 0 ? `${countdown} 秒后自动刷新` : '刷新中...' }}</text>
      <theme-button plain size="small" @click="fetchCode">立即刷新</theme-button>
    </view>

    <view v-if="canVerify" class="code-card code-card--manual">
      <text class="section-title">数字码</text>
      <text class="section-desc">仅供店员手动输入，请勿用于扫码</text>
      <text class="code-value">{{ code || '------' }}</text>
      <theme-button v-if="code" plain size="small" @click="copyCode">复制数字码</theme-button>
    </view>

    <view class="notice-box">
      <text class="notice-box__text">{{ shopStore.miniDisplay.verifyCodeNotice }}</text>
    </view>

    <view v-if="showPicker" class="sheet-mask" @click="closePicker" />
    <view v-if="showPicker" class="sheet-panel">
      <view class="sheet-panel__head">
        <text class="sheet-panel__title">选择核销卡</text>
        <view class="sheet-panel__close" @click="closePicker">关闭</view>
      </view>
      <view class="sheet-search">
        <wd-icon name="search" size="32rpx" color="#b5b0a8" />
        <input
          v-model="keyword"
          class="sheet-search__input"
          type="text"
          placeholder="搜索卡名 / 卡编号"
          confirm-type="search"
        />
      </view>
      <scroll-view scroll-y class="sheet-list">
        <view
          v-for="item in filteredCards"
          :key="item.id"
          class="sheet-item"
          :class="{ 'sheet-item--active': selectedCardId === item.id }"
          @click="selectCard(item.id)"
        >
          <view class="sheet-item__main">
            <view class="sheet-item__row">
              <text class="sheet-item__name">{{ item.name }}</text>
              <text v-if="selectedCardId === item.id" class="sheet-item__tag">当前</text>
            </view>
            <text class="sheet-item__meta">
              {{ item.cardNo || formatCardNo(item.id) }} · {{ cardSummary(item) }}
            </text>
          </view>
          <wd-icon
            v-if="selectedCardId === item.id"
            name="check"
            size="36rpx"
            color="#c9a66b"
          />
        </view>
        <view v-if="!filteredCards.length" class="sheet-empty">未找到匹配的会员卡</view>
      </scroll-view>
    </view>
  </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 32rpx 24rpx 48rpx;
  background: #f5f3f0;
  box-sizing: border-box;
}

.picker-bar {
  margin-bottom: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}

.picker-bar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.picker-bar__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2a26;
}

.picker-bar__count {
  font-size: 22rpx;
  color: #9a958c;
}

.picker-bar__current {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: linear-gradient(135deg, #faf6f0 0%, #fff 100%);
  border: 1rpx solid #efe4cf;
  border-radius: 16rpx;
}

.picker-bar__info {
  flex: 1;
  min-width: 0;
}

.picker-bar__name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2a26;
}

.picker-bar__meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9a958c;
  font-family: 'Courier New', monospace;
}

.picker-bar__action {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
  font-size: 24rpx;
  color: #c9a66b;
}

.code-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  text-align: center;
  box-shadow: 0 12rpx 40rpx rgba(44, 42, 38, 0.08);
  margin-bottom: 24rpx;
}

.code-card--manual {
  padding-top: 32rpx;
  padding-bottom: 36rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2c2a26;
}

.section-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #9a958c;
  line-height: 1.5;
}

.qr-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 32rpx auto 20rpx;
  width: 460rpx;
  height: 460rpx;
  background: #faf8f5;
  border: 1rpx solid #efe9df;
  border-radius: 20rpx;
}

.qr-canvas {
  width: 440rpx;
  height: 440rpx;
}

.code-hint {
  display: block;
  font-size: 24rpx;
  color: #b5b0a8;
  margin-bottom: 16rpx;
}

.code-value {
  display: block;
  margin: 24rpx 0 20rpx;
  padding: 20rpx 16rpx;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.6;
  letter-spacing: 1rpx;
  word-break: break-all;
  color: #5c574f;
  background: #f8f6f2;
  border-radius: 12rpx;
  font-family: 'Courier New', monospace;
}

.refresh-btn,
.copy-btn {
  margin-top: 4rpx;
}

.notice-box {
  padding: 24rpx 28rpx;
  background: #faf6f0;
  border-radius: 16rpx;
  border: 1rpx solid #efe4cf;
}

.notice-box__text {
  display: block;
  font-size: 24rpx;
  line-height: 1.7;
  color: #8b6914;
  white-space: pre-wrap;
  word-break: break-word;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
}

.sheet-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1001;
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.sheet-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 16rpx;
}

.sheet-panel__title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2a26;
}

.sheet-panel__close {
  font-size: 26rpx;
  color: #9a958c;
}

.sheet-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 0 24rpx 16rpx;
  padding: 0 20rpx;
  height: 72rpx;
  background: #f5f3f0;
  border-radius: 36rpx;
}

.sheet-search__input {
  flex: 1;
  font-size: 26rpx;
  color: #2c2a26;
}

.sheet-list {
  flex: 1;
  min-height: 240rpx;
  max-height: 52vh;
  padding: 0 24rpx 24rpx;
  box-sizing: border-box;
}

.sheet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 8rpx;
  border-bottom: 1rpx solid #f0ece6;
}

.sheet-item--active {
  background: linear-gradient(90deg, rgba(201, 166, 107, 0.08), transparent);
}

.sheet-item__main {
  flex: 1;
  min-width: 0;
}

.sheet-item__row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sheet-item__name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2a26;
}

.sheet-item__tag {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  color: #c9a66b;
  background: #faf6f0;
  border-radius: 999rpx;
}

.sheet-item__meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9a958c;
}

.sheet-empty {
  padding: 48rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #b5b0a8;
}
</style>
