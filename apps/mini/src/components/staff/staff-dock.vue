<script setup lang="ts">
import { useShopTheme } from '@/hooks/useShopTheme';

const props = defineProps<{
  active: 'today' | 'scan' | 'member' | 'mine';
}>();

const { palette } = useShopTheme();

const items = [
  { key: 'today' as const, label: '今日', icon: '今', url: '/pages/staff/today' },
  { key: 'scan' as const, label: '扫码', icon: '扫', url: '/pages/staff/scan', primary: true },
  { key: 'member' as const, label: '会员', icon: '员', url: '/pages/staff/member' },
  { key: 'mine' as const, label: '我的', icon: '我', url: '/pages/mine/index', tab: true },
];

function go(url: string, key: string, tab?: boolean) {
  if (props.active === key) return;
  if (tab) {
    uni.switchTab({ url });
    return;
  }
  uni.redirectTo({ url });
}
</script>

<template>
  <view class="staff-dock" :style="{ background: '#fff', borderColor: palette.pageBackground }">
    <view
      v-for="item in items"
      :key="item.key"
      class="staff-dock__item"
      :class="{ 'staff-dock__item--on': active === item.key, 'staff-dock__item--scan': item.primary }"
      @click="go(item.url, item.key, item.tab)"
    >
      <view
        class="staff-dock__icon"
        :class="{ 'staff-dock__icon--on': active === item.key, 'staff-dock__icon--scan': item.primary }"
        :style="
          item.primary
            ? { background: palette.buttonBgColor, color: palette.buttonTextColor }
            : active === item.key
              ? { background: palette.primaryColor, color: '#fff' }
              : {}
        "
      >
        <text class="staff-dock__icon-text">{{ item.icon }}</text>
      </view>
      <text
        class="staff-dock__label"
        :style="{ color: active === item.key || item.primary ? palette.primaryColor : palette.secondaryColor }"
      >
        {{ item.label }}
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.staff-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 12rpx 16rpx calc(12rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #ebe6df;
  box-shadow: 0 -8rpx 32rpx rgba(44, 42, 38, 0.08);
}

.staff-dock__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 0;
}

.staff-dock__item--scan {
  margin-top: -20rpx;
}

.staff-dock__icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: #f7f5f2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.staff-dock__icon--scan {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  box-shadow: 0 12rpx 28rpx rgba(44, 42, 38, 0.18);
}

.staff-dock__icon-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #6b6560;
}

.staff-dock__icon--on .staff-dock__icon-text,
.staff-dock__icon--scan .staff-dock__icon-text {
  color: inherit;
}

.staff-dock__label {
  font-size: 20rpx;
  font-weight: 600;
}
</style>
