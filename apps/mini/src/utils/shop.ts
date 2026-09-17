import { DEFAULT_SHOP_ID } from '@/config';

const SHOP_ID_KEY = 'shop_id';

export function parseScene(scene?: string): number | null {
  if (!scene) return null;
  const decoded = decodeURIComponent(scene);
  const match = decoded.match(/^s(\d+)$/i);
  return match ? Number(match[1]) : null;
}

export function getShopId(): number {
  const stored = uni.getStorageSync(SHOP_ID_KEY);
  if (stored) return Number(stored);
  return DEFAULT_SHOP_ID;
}

export function setShopId(id: number) {
  uni.setStorageSync(SHOP_ID_KEY, id);
}

/** 开发环境固定演示店铺，避免缓存了旧 shop_id=1 导致项目/时段对不上 */
export function ensureDemoShop(): number {
  const fromScene = getShopId();
  // #ifdef MP-WEIXIN
  if (import.meta.env.DEV && fromScene !== DEFAULT_SHOP_ID) {
    setShopId(DEFAULT_SHOP_ID);
    return DEFAULT_SHOP_ID;
  }
  // #endif
  if (!uni.getStorageSync(SHOP_ID_KEY)) {
    setShopId(DEFAULT_SHOP_ID);
  }
  return getShopId();
}

export function initShopFromLaunch(options?: { scene?: string | number; query?: Record<string, string> }) {
  const fromScene = parseScene(
    typeof options?.scene === 'string' ? options.scene : String(options?.scene || ''),
  );
  if (fromScene) {
    setShopId(fromScene);
    return fromScene;
  }
  const qShop = options?.query?.shopId || options?.query?.s;
  if (qShop) {
    const id = Number(String(qShop).replace(/^s/i, ''));
    if (id > 0) {
      setShopId(id);
      return id;
    }
  }
  return ensureDemoShop();
}
