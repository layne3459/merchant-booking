/** 后台保存时留空或传此值表示不修改已有密钥 */
export const WX_SECRET_KEEP = '********';

export interface ShopWxConfigInput {
  appId?: string;
  appSecret?: string;
  mchId?: string;
  apiV3Key?: string;
  serialNo?: string;
  tplBookingSuccess?: string;
  tplBookingRemind?: string;
  tplNewBooking?: string;
}

export interface StoredShopWxConfig {
  appId?: string;
  appSecretEnc?: string;
  mchId?: string;
  apiV3KeyEnc?: string;
  serialNo?: string;
  hasPrivateKey?: boolean;
  hasPlatformCert?: boolean;
  tplBookingSuccess?: string;
  tplBookingRemind?: string;
  tplNewBooking?: string;
}

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

export interface EffectiveWxConfig {
  appId: string;
  appSecret: string;
  mchId: string;
  apiV3Key: string;
  serialNo: string;
  privateKeyPath: string;
  platformCertPath: string;
  notifyUrl: string;
  tplBookingSuccess: string;
  tplBookingRemind: string;
  tplNewBooking: string;
}

export interface WxConfigStatus {
  miniReady: boolean;
  payReady: boolean;
  notifyUrl: string;
  shopId?: number;
  source: 'shop' | 'env' | 'none';
  hints: string[];
}

export const EMPTY_WX_CONFIG_PUBLIC: ShopWxConfigPublic = {
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

function isPlaceholderAppId(appId: string) {
  return !appId || appId.includes('xxxx') || appId === 'touristappid';
}

function isPlaceholderMchId(mchId: string) {
  return !mchId || /^1234567890$/.test(mchId);
}

export function maskSecret(value: string, visible = 4): string {
  if (!value) return '';
  if (value.length <= visible * 2) return WX_SECRET_KEEP;
  return `${value.slice(0, visible)}${'*'.repeat(4)}${value.slice(-visible)}`;
}

export function shouldKeepSecret(input?: string): boolean {
  if (!input || input === WX_SECRET_KEEP) return true;
  return /^\*+$/.test(input);
}

export function getWxConfigStatus(
  config: EffectiveWxConfig & { hasPrivateKey?: boolean },
  source: WxConfigStatus['source'],
): WxConfigStatus {
  const hints: string[] = [];
  const miniReady =
    Boolean(config.appId && config.appSecret) &&
    !isPlaceholderAppId(config.appId) &&
    !config.appSecret.includes('xxxx');

  if (!miniReady) {
    hints.push('请填写小程序 AppID 与 AppSecret，保存后登录与门店码可用');
  }

  const payReady =
    miniReady &&
    Boolean(config.mchId && config.apiV3Key && config.serialNo) &&
    !isPlaceholderMchId(config.mchId) &&
    Boolean(config.privateKeyPath && config.hasPrivateKey) &&
    config.apiV3Key.length === 32;

  if (miniReady && !payReady) {
    if (isPlaceholderMchId(config.mchId)) hints.push('请填写微信支付商户号');
    if (!config.apiV3Key || config.apiV3Key.length !== 32) hints.push('请填写 32 位 API v3 密钥');
    if (!config.serialNo) hints.push('请填写商户 API 证书序列号');
    if (!config.privateKeyPath) hints.push('请上传商户私钥 apiclient_key.pem');
  }

  if (source === 'env') {
    hints.push('当前读取服务器 .env 占位配置，请在下方填写真实信息并保存');
  }

  if (config.notifyUrl && !config.notifyUrl.startsWith('https://')) {
    hints.push('本地开发地址无法用于微信回调，上线请将服务器 API_BASE_URL 改为 https 公网域名');
  }

  return {
    miniReady,
    payReady: payReady && config.notifyUrl.startsWith('https://'),
    notifyUrl: config.notifyUrl,
    source,
    hints,
  };
}

// Extend EffectiveWxConfig with optional hasPrivateKey for status check - used in WxConfigService
