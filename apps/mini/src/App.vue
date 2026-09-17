<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { getActivePinia } from 'pinia';
import { initShopFromLaunch } from '@/utils/shop';
import { useUserStore } from '@/stores/user';
import { useShopStore } from '@/stores/shop';

let loginWarmed = false;

const shopStore = useShopStore();

function warmUpLogin() {
  if (loginWarmed) return;
  loginWarmed = true;
  const pinia = getActivePinia();
  if (!pinia) return;
  const store = useUserStore(pinia);
  if (!store.manualLoggedOut && store.ensureLogin) {
    void store.ensureLogin();
  }
}

onLaunch(async (options) => {
  initShopFromLaunch(options as { scene?: string; query?: Record<string, string> });
  await shopStore.ensureShop();
});

onShow((options) => {
  initShopFromLaunch(options as { scene?: string; query?: Record<string, string> });
  void shopStore.ensureShop(true);
  warmUpLogin();
});
</script>

<template>
  <view />
</template>

<style lang="scss">
@import './styles/theme.scss';
</style>
