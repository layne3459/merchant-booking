<script setup lang="ts">
import { useShopTheme } from '@/hooks/useShopTheme';

defineProps<{
  title: string;
  subtitle?: string;
  badgeNum?: number;
  badgeLabel?: string;
}>();

const { primaryColor } = useShopTheme();
</script>

<template>
  <view class="staff-header">
    <view class="staff-header__main">
      <text class="staff-header__title">{{ title }}</text>
      <text v-if="subtitle" class="staff-header__sub">{{ subtitle }}</text>
    </view>
    <view v-if="badgeNum !== undefined" class="staff-header__badge">
      <text class="staff-header__badge-num">{{ badgeNum }}</text>
      <text class="staff-header__badge-label">{{ badgeLabel || '今日' }}</text>
    </view>
    <view class="staff-header__glow" :style="{ background: primaryColor }"></view>
  </view>
</template>

<style scoped lang="scss">
.staff-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 32rpx 40rpx;
  background: linear-gradient(160deg, var(--mb-hero-dark) 0%, var(--mb-hero-mid) 55%, var(--mb-primary) 100%);
  color: #fff;
  overflow: hidden;
}

.staff-header__glow {
  position: absolute;
  right: -40rpx;
  top: -60rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  opacity: 0.22;
  filter: blur(20rpx);
}

.staff-header__main {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.staff-header__title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.3;
}

.staff-header__sub {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.85;
  line-height: 1.4;
}

.staff-header__badge {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  text-align: center;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 18rpx;
  padding: 18rpx 28rpx;
  backdrop-filter: blur(8px);
}

.staff-header__badge-num {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1;
}

.staff-header__badge-label {
  display: block;
  font-size: 22rpx;
  margin-top: 8rpx;
  opacity: 0.88;
}
</style>
