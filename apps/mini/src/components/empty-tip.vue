<script setup lang="ts">
defineProps<{
  icon?: string;
  tip: string;
}>();
</script>

<template>
  <view class="empty-tip">
    <view class="empty-tip__icon">{{ icon || '📭' }}</view>
    <text class="empty-tip__text">{{ tip }}</text>
    <view v-if="$slots.bottom" class="empty-tip__bottom">
      <slot name="bottom" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 48rpx;
}

.empty-tip__icon {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(145deg, #f0ebe3, #e8e2d8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64rpx;
  margin-bottom: 24rpx;
}

.empty-tip__text {
  font-size: 28rpx;
  color: #9a958c;
}

.empty-tip__bottom {
  margin-top: 24rpx;
}
</style>
