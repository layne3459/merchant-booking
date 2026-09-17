<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '@/api';
import { fenToYuan } from '@/utils/request';
import { useUserStore } from '@/stores/user';
import { useShopStore } from '@/stores/shop';
import { handlePaymentResult } from '@/utils/payment';
import { markPageRefresh } from '@/utils/page-cache';
import { formatCardTemplateNo } from '@/utils/card';
import {
  cardTemplateHighlight,
  cardTemplateHighlightUnit,
  cardThemeClass,
  cardTypeLabel,
} from '@/utils/booking-ui';
import { useShopTheme } from '@/hooks/useShopTheme';
import { useShopShare } from '@/utils/share';

const user = useUserStore();
const shopStore = useShopStore();
const { pageStyleStr } = useShopTheme();
useShopShare();
const templates = ref<any[]>([]);
const loading = ref(true);
const loaded = ref(false);
const buyingId = ref<number | null>(null);

onLoad(async () => {
  if (loaded.value) return;
  loading.value = true;
  try {
    await shopStore.ensureShop();
    const ok = await user.ensureLogin();
    if (!ok) return;
    templates.value = (await api.getCardTemplates()) as any[];
    loaded.value = true;
  } finally {
    loading.value = false;
  }
});

async function handleLogin() {
  const ok = await user.login();
  if (!ok || loaded.value) return;
  loading.value = true;
  try {
    templates.value = (await api.getCardTemplates()) as any[];
    loaded.value = true;
  } finally {
    loading.value = false;
  }
}

async function buy(templateId: number) {
  if (buyingId.value) return;
  buyingId.value = templateId;
  try {
    const result: any = await api.purchaseCard(templateId);
    if (result.payment?.devAutoPaid) {
      await new Promise<void>((resolve) => {
        uni.showModal({
          title: '开发模式',
          content:
            '当前店铺未配置微信支付，系统已自动模拟支付成功。正式上线请在后台「店铺设置 → 微信与支付」完成配置。',
          showCancel: false,
          success: () => resolve(),
        });
      });
    } else if (result.payment?.payParams) {
      await handlePaymentResult(result.payment);
    } else {
      throw new Error('无法发起支付');
    }
    markPageRefresh('cards');
    uni.showToast({ title: '购买成功', icon: 'success' });
    setTimeout(() => uni.switchTab({ url: '/pages/card/list' }), 800);
  } catch {
    // 用户取消支付或下单失败时，request/payment 已提示
  } finally {
    buyingId.value = null;
  }
}
</script>

<template>
  <page-meta :page-style="pageStyleStr" />
  <shop-theme-root>
  <view class="page">
    <view class="hero">
      <view class="hero__glow" />
      <text class="hero__eyebrow">MEMBERSHIP</text>
      <text class="hero__title">选择会员卡</text>
      <text class="hero__sub">{{ shopStore.miniDisplay.cardBuySubtitle }}</text>
    </view>

    <view class="content">
      <wd-skeleton v-if="loading" :row-col="[[{ width: '100%', height: '320rpx' }], 2]" animation="gradient" />

      <empty-tip v-else-if="!user.isLoggedIn" icon="👤" tip="登录后购买会员卡">
        <template #bottom>
          <theme-button round @click="handleLogin">立即登录</theme-button>
        </template>
      </empty-tip>

      <empty-tip v-else-if="!templates.length" icon="🎫" tip="暂无可购买的会员卡" />

      <view v-else class="tpl-list">
        <view
          v-for="item in templates"
          :key="item.id"
          class="tpl-card"
          :class="cardThemeClass(item.theme)"
        >
          <view class="tpl-card__shine" />
          <view class="tpl-card__chip" />

          <view class="tpl-card__head">
            <view>
              <text class="tpl-card__brand">BEAUTY CLUB · {{ formatCardTemplateNo(item.id) }}</text>
              <text class="tpl-card__name">{{ item.name }}</text>
            </view>
            <view class="tpl-card__badge">{{ cardTypeLabel(item) }}</view>
          </view>

          <view class="tpl-card__value">
            <text class="tpl-card__amount">{{ cardTemplateHighlight(item, fenToYuan) }}</text>
            <text v-if="cardTemplateHighlightUnit(item)" class="tpl-card__unit">
              {{ cardTemplateHighlightUnit(item) }}
            </text>
          </view>

          <view class="tpl-card__benefits">
            <text v-for="(line, index) in item.benefits || []" :key="index" class="tpl-card__benefit">{{ line }}</text>
          </view>
          <text v-if="item.description" class="tpl-card__note">{{ item.description }}</text>

          <view class="tpl-card__footer">
            <view class="tpl-card__price">
              <text class="tpl-card__price-label">售价</text>
              <text class="tpl-card__price-value">¥{{ fenToYuan(item.price) }}</text>
            </view>
            <view
              class="tpl-card__btn mb-theme-btn"
              :class="{ 'tpl-card__btn--loading': buyingId === item.id }"
              @click="buy(item.id)"
            >
              {{ buyingId === item.id ? '处理中...' : '立即购买' }}
            </view>
          </view>
        </view>
      </view>

      <view class="legal-links">
        <text @click="uni.navigateTo({ url: '/pages/legal/index?type=agreement' })">用户协议</text>
        <text class="legal-links__dot">·</text>
        <text @click="uni.navigateTo({ url: '/pages/legal/index?type=refund' })">退卡与订金规则</text>
      </view>
    </view>
  </view>
  </shop-theme-root>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f3f0;
}

.hero {
  position: relative;
  overflow: hidden;
  padding: 48rpx 32rpx 72rpx;
  background: linear-gradient(145deg, #2a2420 0%, #4a3f36 45%, #8b6d4a 100%);
}

.hero__glow {
  position: absolute;
  top: -80rpx;
  right: -40rpx;
  width: 280rpx;
  height: 280rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.hero__eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 6rpx;
  color: rgba(255, 255, 255, 0.55);
}

.hero__title {
  display: block;
  margin-top: 12rpx;
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
}

.hero__sub {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.5;
}

.content {
  margin-top: -36rpx;
  padding: 0 24rpx 48rpx;
}

.tpl-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.tpl-card {
  position: relative;
  overflow: hidden;
  padding: 36rpx 32rpx 28rpx;
  border-radius: 24rpx;
  color: #fff;
  box-shadow: 0 20rpx 48rpx rgba(0, 0, 0, 0.14);
}

.card--balance {
  background: linear-gradient(135deg, #1a1612 0%, #3d3228 35%, #a8845a 100%);
}

.card--times {
  background: linear-gradient(135deg, #2d1f2e 0%, #5c3d4a 40%, #c47b8a 100%);
}

.card--period {
  background: linear-gradient(135deg, #1a2030 0%, #2d3a5c 40%, #6b8cae 100%);
}

.tpl-card__shine {
  position: absolute;
  top: -60rpx;
  right: -60rpx;
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.tpl-card__chip {
  position: absolute;
  top: 36rpx;
  right: 32rpx;
  width: 52rpx;
  height: 38rpx;
  border-radius: 8rpx;
  background: linear-gradient(135deg, #f5e6c8, #d4af6a);
  opacity: 0.85;
}

.tpl-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  z-index: 1;
  padding-right: 72rpx;
}

.tpl-card__brand {
  display: block;
  font-size: 20rpx;
  letter-spacing: 4rpx;
  opacity: 0.7;
}

.tpl-card__name {
  display: block;
  margin-top: 8rpx;
  font-size: 34rpx;
  font-weight: 700;
}

.tpl-card__badge {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.tpl-card__value {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin: 36rpx 0 12rpx;
  position: relative;
  z-index: 1;
}

.tpl-card__amount {
  font-size: 64rpx;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 2rpx;
}

.tpl-card__unit {
  font-size: 28rpx;
  opacity: 0.85;
}

.tpl-card__benefits {
  margin-top: 12rpx;
  position: relative;
  z-index: 1;
}

.tpl-card__benefit {
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  opacity: 0.88;
}

.tpl-card__benefit + .tpl-card__benefit {
  margin-top: 6rpx;
}

.tpl-card__note {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  opacity: 0.72;
  position: relative;
  z-index: 1;
}

.tpl-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.18);
  position: relative;
  z-index: 1;
}

.tpl-card__price-label {
  display: block;
  font-size: 22rpx;
  opacity: 0.7;
}

.tpl-card__price-value {
  display: block;
  margin-top: 4rpx;
  font-size: 36rpx;
  font-weight: 700;
}

.tpl-card__btn {
  flex-shrink: 0;
  min-width: 200rpx;
  padding: 18rpx 36rpx;
  font-size: 26rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
}

.tpl-card__btn--loading {
  opacity: 0.72;
}

.legal-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
  margin-top: 32rpx;
  font-size: 22rpx;
  color: #9a958c;
}

.legal-links__dot {
  opacity: 0.6;
}
</style>
