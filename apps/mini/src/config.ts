export const DEFAULT_SHOP_ID = 10000000001;

// 订阅消息模板 ID（与后端 .env 中配置一致，留空则跳过授权弹窗）
export const SUBSCRIBE_TMPL_IDS: string[] = [];

const ENV_API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://127.0.0.1:3000/api';
const DEV_API_BASE = 'http://127.0.0.1:3000/api';

function isDevtoolsHost(platform: string) {
  return ['devtools', 'windows', 'mac', 'devtools-app'].includes(platform);
}

function getWxPlatform() {
  try {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && wx.getAppBaseInfo) {
      return wx.getAppBaseInfo().platform || '';
    }
    // #endif
    return uni.getSystemInfoSync().platform || '';
  } catch {
    return '';
  }
}

/** 微信小程序开发：开发者工具同机调试优先 127.0.0.1，真机用局域网 IP */
export function getApiBase() {
  // #ifdef H5
  return '/api';
  // #endif
  // #ifndef H5
  // #ifdef MP-WEIXIN
  if (import.meta.env.DEV) {
    const platform = getWxPlatform();
    if (!platform || isDevtoolsHost(platform)) {
      return DEV_API_BASE;
    }
  }
  // #endif
  return ENV_API_BASE;
  // #endif
}

/**
 * API 地址（兼容旧引用；请求层请优先用 getApiBase()）
 */
export const API_BASE = getApiBase();

/** 将相对路径转为可访问的完整图片 URL */
export function resolveImageUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getApiBase().replace(/\/api$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

/** 构建时注入的微信 AppID（来自 merchant-booking/.env 的 WX_APPID） */
export const WX_APPID = (import.meta.env.VITE_WX_APPID as string) || '';

/** 是否为占位/游客 AppID（与后端 WechatService.isDevMode 一致） */
export function isWxPlaceholderAppId(appId = WX_APPID): boolean {
  return !appId || appId === 'touristappid' || appId.includes('xxxx');
}

/** 是否配置了可用的微信小程序 AppID（不调用微信运行时 API，避免游客模式报错） */
export function hasValidWxAppId(): boolean {
  // #ifdef MP-WEIXIN
  return /^wx[a-f0-9]{16}$/i.test(WX_APPID) && !isWxPlaceholderAppId();
  // #endif
  return false;
}

/** 开发环境固定登录 code，与 seed 演示会员 openid 对应 */
export function devWxLoginCode() {
  return 'dev_demo_user';
}
