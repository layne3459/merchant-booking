<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';

/** 员工「我的」已合并到顾客端 Tab「我的」，此页仅做兼容跳转 */
onShow(() => {
  uni.switchTab({ url: '/pages/mine/index' });
});
</script>

<template>
  <view class="redirect-page" />
</template>

<style scoped lang="scss">
.redirect-page {
  min-height: 100vh;
  background: #f5f3f0;
}
</style>
