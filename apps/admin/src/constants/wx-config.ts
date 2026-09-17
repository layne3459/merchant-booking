/** 后台保存时留空或传此值表示不修改已有密钥 */
export const WX_SECRET_KEEP = '********';

export interface ShopWxConfigPublic {
  appId: string;
  appSecret: string;
  mchId: string;
  apiV3Key: string;
  serialNo: string;
  tplBookingSuccess: string;
  tplBookingRemind: string;
  tplNewBooking: string;
  hasPrivateKey: boolean;
  hasPlatformCert: boolean;
}

export interface WxConfigStatus {
  miniReady: boolean;
  payReady: boolean;
  notifyUrl: string;
  shopId?: number;
  source: 'shop' | 'env' | 'none';
  hints: string[];
}

export const EMPTY_WX_CONFIG: ShopWxConfigPublic = {
  appId: '',
  appSecret: '',
  mchId: '',
  apiV3Key: '',
  serialNo: '',
  tplBookingSuccess: '',
  tplBookingRemind: '',
  tplNewBooking: '',
  hasPrivateKey: false,
  hasPlatformCert: false,
};

export function mergeWxConfig(input?: Partial<ShopWxConfigPublic> | null): ShopWxConfigPublic {
  return {
    ...EMPTY_WX_CONFIG,
    ...(input ?? {}),
  };
}
