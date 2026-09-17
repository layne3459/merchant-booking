import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api';
import { formatBusinessHours, mergeMiniDisplay, mergeShopTheme } from '@/utils/shop-display';
import { applyRuntimeTheme } from '@/utils/shop-theme';

export const useShopStore = defineStore('shop', () => {
  const shop = ref<Record<string, unknown> | null>(null);
  let loadPromise: Promise<void> | null = null;

  const miniDisplay = computed(() =>
    mergeMiniDisplay(shop.value?.miniDisplay as Parameters<typeof mergeMiniDisplay>[0]),
  );

  const theme = computed(() => mergeShopTheme(miniDisplay.value.theme));

  const businessHoursText = computed(() =>
    formatBusinessHours(shop.value?.businessHours as Record<string, string[]> | null),
  );

  async function ensureShop(force = false) {
    if (shop.value && !force) return shop.value;
    if (!loadPromise || force) {
      loadPromise = (async () => {
        const data = (await api.getShop({ silent: true })) as Record<string, unknown>;
        shop.value = {
          ...data,
          miniDisplay: mergeMiniDisplay(data.miniDisplay),
        };
        applyRuntimeTheme(mergeMiniDisplay(data.miniDisplay).theme);
      })().finally(() => {
        loadPromise = null;
      });
    }
    await loadPromise;
    return shop.value;
  }

  function clear() {
    shop.value = null;
  }

  return { shop, miniDisplay, theme, businessHoursText, ensureShop, clear };
});
