<script setup lang="ts">
import { computed, ref } from 'vue';
import { api } from '@/api';
import { fenToYuan } from '@/utils/request';
import { useUserStore } from '@/stores/user';
import { useShopStore } from '@/stores/shop';
import { cardThemeClass, cardTypeLabel } from '@/utils/booking-ui';
import { formatCardNo } from '@/utils/card';
import { getNavBarMetrics } from '@/utils/nav-bar';
import { useStalePageLoad } from '@/utils/page-cache';

import { useShopTheme } from '@/hooks/useShopTheme';

const user = useUserStore();
const shopStore = useShopStore();
const { pageStyleStr, primaryColor } = useShopTheme();
const list = ref<any[]>([]);
const nav = getNavBarMetrics();
const navWrapStyle = { paddingTop: `${nav.statusBarHeight}px` };
const navBarStyle = { height: `${nav.navBarHeight}px` };

const { loading, reload } = useStalePageLoad(
  async () => {
    await shopStore.ensureShop();
    const ok = await user.ensureLogin();
    if (!ok) return [];
    return (await api.myCards()) as any[];
  },
  (data) => {
    list.value = data;
  },
  { refreshKey: 'cards' },
);

const totalBalance = computed(() => {
  return list.value
    .filter((c) => c.deductMode === 'balance')
    .reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
});

const totalTimes = computed(() => {
  return list.value
    .filter((c) => c.deductMode === 'times')
    .reduce((sum, c) => sum + (Number(c.remainTimes) || 0), 0);
});

function showCode() {
  uni.navigateTo({ url: '/pages/verify/code' });
}

function buy() {
  uni.navigateTo({ url: '/pages/card/buy' });
}

async function handleLogin() {
  const ok = await user.login();
  if (ok) await reload();
}

function cardValue(item: any) {
  if (item.deductMode === 'times') return `${item.remainTimes}`;
  if (item.deductMode === 'period') return '有效中';
  return fenToYuan(item.balance);
}

function cardUnit(item: any) {
  if (item.deductMode === 'times') return '次';
  if (item.deductMode === 'period') return '';
  return '元';
}

function cardNo(item: any) {
  return item.cardNo || formatCardNo(item.id);
}
</script>

<template>
  <page-meta :page-style="pageStyleStr" />
  <shop-theme-root>
  <view class="page">
    <view class="wallet">
      <view class="wallet__top">
        <view class="wallet__nav" :style="navWrapStyle">
          <view class="wallet__nav-bar" :style="navBarStyle">
            <text class="wallet__nav-title">我的会员卡</text>
          </view>
        </view>
      </view>
      <view class="wallet__content">
        <template v-if="user.isLoggedIn">
          <text class="wallet__label">账户概览</text>
          <view class="wallet__stats">
            <view class="stat">
              <text class="stat__val">{{ list.length }}</text>
              <text class="stat__key">张卡</text>
            </view>
            <view class="stat-divider" />
            <view class="stat">
              <text class="stat__val">{{ totalBalance ? fenToYuan(totalBalance) : '0' }}</text>
              <text class="stat__key">储值余额</text>
            </view>
            <view class="stat-divider" />
            <view class="stat">
              <text class="stat__val">{{ totalTimes }}</text>
              <text class="stat__key">剩余次数</text>
            </view>
          </view>

          <view class="wallet__actions">
            <view class="action-btn action-btn--primary" @click="showCode">
              <wd-icon name="qrcode" size="40rpx" :color="primaryColor" />
              <text>出示核销码</text>
            </view>
            <view class="action-btn mb-theme-btn" @click="buy">
              <wd-icon name="add-circle" size="40rpx" color="#fff" />
              <text>购买新卡</text>
            </view>
          </view>
        </template>
        <template v-else>
          <text class="wallet__label">我的会员卡</text>
          <text class="wallet__guest-tip">登录后查看卡包余额与核销码</text>
          <view class="wallet__actions wallet__actions--guest">
            <view class="action-btn action-btn--primary" @click="handleLogin">
              <wd-icon name="user" size="40rpx" :color="primaryColor" />
              <text>立即登录</text>
            </view>
          </view>
        </template>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">我的卡包</text>
        <text class="section-sub">{{ list.length }} 张可用</text>
      </view>

      <wd-skeleton v-if="loading" :row-col="[[{ width: '100%', height: '280rpx' }], 1]" animation="gradient" />

      <empty-tip v-else-if="!user.isLoggedIn" icon="💳" tip="登录后查看会员卡">
        <template #bottom>
          <theme-button round @click="handleLogin">立即登录</theme-button>
        </template>
      </empty-tip>

      <empty-tip v-else-if="!list.length" icon="💳" :tip="shopStore.miniDisplay.cardEmptyTip">
        <template #bottom>
          <theme-button round @click="buy">立即购卡</theme-button>
        </template>
      </empty-tip>

      <view v-else class="card-list">
        <view
          v-for="item in list"
          :key="item.id"
          class="member-card"
          :class="cardThemeClass(item.theme)"
        >
          <view class="member-card__shine" />
          <view class="member-card__chip" />
          <view class="member-card__top">
            <view>
              <text class="member-card__brand">BEAUTY CLUB</text>
              <text class="member-card__name">{{ item.name }}</text>
            </view>
            <view class="member-card__type">{{ cardTypeLabel(item) }}</view>
          </view>

          <view class="member-card__balance">
            <text class="member-card__amount">{{ cardValue(item) }}</text>
            <text v-if="cardUnit(item)" class="member-card__unit">{{ cardUnit(item) }}</text>
          </view>

          <view class="member-card__footer">
            <text>卡编号 {{ cardNo(item) }}</text>
            <text>至 {{ item.expireAt ? String(item.expireAt).slice(0, 10) : '永久' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: var(--mb-page-bg);
}

.wallet {
  position: relative;
}

.wallet__top {
  background: linear-gradient(145deg, var(--mb-hero-dark) 0%, var(--mb-hero-mid) 40%, var(--mb-primary) 100%);
  padding-bottom: 56rpx;
}

.wallet__nav-bar {
  display: flex;
  align-items: center;
  justify-content: center;
}

.wallet__nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 2rpx;
}

.wallet__content {
  position: relative;
  margin: -40rpx 24rpx 0;
  padding: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 24rpx;
  box-shadow: 0 16rpx 48rpx rgba(44, 42, 38, 0.1);
}

.wallet__label {
  display: block;
  font-size: 28rpx;
  color: var(--mb-secondary);
  margin-bottom: 20rpx;
}

.wallet__stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat {
  text-align: center;
  flex: 1;
}

.stat__val {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: var(--mb-title);
}

.stat__key {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--mb-secondary);
}

.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: #ebe6df;
}

.wallet__actions {
  display: flex;
  gap: 16rpx;
  margin-top: 28rpx;

  &--guest {
    margin-top: 32rpx;
  }
}

.wallet__guest-tip {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.75);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 22rpx 0;
  border-radius: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
}

.action-btn.mb-theme-btn {
  box-shadow: 0 8rpx 20rpx rgba(44, 42, 38, 0.12);
}

.action-btn--primary {
  color: var(--mb-btn-outline-text);
  background: transparent;
  border: 2rpx solid var(--mb-btn-border);
}

.section {
  padding: 32rpx 24rpx 48rpx;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20rpx;
  padding: 0 8rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--mb-title);
}

.section-sub {
  font-size: 24rpx;
  color: var(--mb-secondary);
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.member-card {
  position: relative;
  overflow: hidden;
  border-radius: 24rpx;
  padding: 36rpx 32rpx 28rpx;
  color: #fff;
  min-height: 280rpx;
  box-shadow: 0 20rpx 48rpx rgba(0, 0, 0, 0.15);
}

.card--balance {
  background: linear-gradient(135deg, #1a1612 0%, var(--mb-hero-dark) 35%, var(--mb-primary) 100%);
}

.card--times {
  background: linear-gradient(135deg, #2d1f2e 0%, #5c3d4a 40%, #c47b8a 100%);
}

.card--period {
  background: linear-gradient(135deg, #1a2030 0%, #2d3a5c 40%, #6b8cae 100%);
}

.member-card__shine {
  position: absolute;
  top: -60rpx;
  right: -60rpx;
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.member-card__chip {
  position: absolute;
  top: 36rpx;
  right: 32rpx;
  width: 56rpx;
  height: 42rpx;
  border-radius: 8rpx;
  background: linear-gradient(135deg, #f5e6c8, #d4af6a);
  opacity: 0.85;
}

.member-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
}

.member-card__brand {
  display: block;
  font-size: 20rpx;
  letter-spacing: 4rpx;
  opacity: 0.7;
}

.member-card__name {
  display: block;
  margin-top: 8rpx;
  font-size: 34rpx;
  font-weight: 700;
}

.member-card__type {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.member-card__balance {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin: 48rpx 0 24rpx;
  position: relative;
  z-index: 1;
}

.member-card__amount {
  font-size: 64rpx;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 2rpx;
}

.member-card__unit {
  font-size: 28rpx;
  opacity: 0.85;
}

.member-card__footer {
  display: flex;
  justify-content: space-between;
  font-size: 22rpx;
  opacity: 0.75;
  position: relative;
  z-index: 1;
  font-family: 'Courier New', monospace;
}
</style>
