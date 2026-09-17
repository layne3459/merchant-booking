<script setup lang="ts">
import { useShopTheme } from '@/hooks/useShopTheme';

const { themeStyle, themeVars } = useShopTheme();
</script>

<template>
  <wd-config-provider :theme-vars="themeVars">
    <view class="shop-theme-root" :style="themeStyle">
      <slot />
    </view>
    <wd-toast />
    <wd-message-box />
  </wd-config-provider>
</template>

<style scoped lang="scss">
.shop-theme-root {
  min-height: 100%;
}
</style>
