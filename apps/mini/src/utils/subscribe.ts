import { SUBSCRIBE_TMPL_IDS } from '@/config';
import { useShopStore } from '@/stores/shop';

export function requestSubscribeMessage() {
  const fromShop = (useShopStore().shop?.subscribeTmplIds as string[] | undefined) || [];
  const tmplIds = [...new Set([...SUBSCRIBE_TMPL_IDS, ...fromShop])].filter(Boolean);
  if (!tmplIds.length) return Promise.resolve();

  return new Promise<void>((resolve) => {
    // #ifdef MP-WEIXIN
    uni.requestSubscribeMessage({
      tmplIds,
      complete: () => resolve(),
    });
    // #endif
    // #ifndef MP-WEIXIN
    resolve();
    // #endif
  });
}
