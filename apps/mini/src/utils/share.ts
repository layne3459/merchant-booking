import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';
import { getShopId } from '@/utils/shop';
import { useShopStore } from '@/stores/shop';

export function useShopShare(extraPath?: () => string) {
  const shopStore = useShopStore();

  function payload() {
    const shopId = getShopId();
    const name = String(shopStore.shop?.name || '预约会员');
    return {
      title: `${name} · 在线预约`,
      path: extraPath?.() || `/pages/index/index?shopId=${shopId}`,
    };
  }

  onShareAppMessage(() => payload());
  onShareTimeline(() => payload());
}
