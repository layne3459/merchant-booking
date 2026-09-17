import { DEFAULT_MINI_THEME, mergeShopTheme, type MiniThemeConfig } from './shop-theme';

export type { MiniThemeConfig };

export interface MiniHighlight {
  icon: string;
  title: string;
  desc: string;
}

export interface MiniBookingStep {
  title: string;
  desc: string;
}

export interface MiniQuickActionLabels {
  bookings: string;
  card: string;
  verify: string;
  call: string;
}

export interface MiniBookingRules {
  /** 建议提前到店分钟数 */
  arriveEarlyMinutes: number;
  /** 迟到宽限分钟数 */
  lateGraceMinutes: number;
  /** 需提前多少小时取消，0 表示不限制 */
  cancelBeforeHours: number;
  /** 爽约时订金：forfeit 不退，refund 退还 */
  noShowDepositPolicy: 'forfeit' | 'refund';
}

export interface MiniDisplayConfig {
  homeNotice: string;
  heroDefaultTitle: string;
  heroDefaultSubtitle: string;
  homeServicesTitle: string;
  homeServicesSubtitle: string;
  quickActions: MiniQuickActionLabels;
  serviceHighlights: MiniHighlight[];
  bookingSteps: MiniBookingStep[];
  bookingNotices: string[];
  bookingRules: MiniBookingRules;
  bookingConfirmTip: string;
  verifyCodeNotice: string;
  cardBuySubtitle: string;
  cardEmptyTip: string;
  cancelBookingTip: string;
  slotsEmptyTip: string;
  availabilityDays: number;
  defaultServiceDescription: string;
  allowManualPhoneBind: boolean;
  theme: MiniThemeConfig;
}

export const DEFAULT_MINI_DISPLAY: MiniDisplayConfig = {
  homeNotice: '新客首次预约享专属礼遇，会员卡充值更优惠',
  heroDefaultTitle: '专业美容护理',
  heroDefaultSubtitle: '在线预约 · 尊享服务',
  homeServicesTitle: '热门服务',
  homeServicesSubtitle: '精选项目 · 专业技师',
  quickActions: {
    bookings: '我的预约',
    card: '购买会员卡',
    verify: '核销码',
    call: '联系门店',
  },
  serviceHighlights: [
    { icon: '✨', title: '专业技师', desc: '一对一贴心服务' },
    { icon: '📅', title: '在线预约', desc: '随时查看可约时段' },
    { icon: '🔄', title: '灵活改约', desc: '支持免费改期' },
    { icon: '💳', title: '会员权益', desc: '持卡享更多优惠' },
  ],
  bookingSteps: [
    { title: '选择时段', desc: '查看可约日期与时间' },
    { title: '确认预约', desc: '核对信息完成预约' },
    { title: '到店体验', desc: '准时到店享受服务' },
  ],
  bookingNotices: [
    '请提前 10 分钟到店，以便为您做好准备',
    '如需改约或取消，请提前联系门店',
    '迟到超过 15 分钟，门店有权调整服务安排',
  ],
  bookingRules: {
    arriveEarlyMinutes: 10,
    lateGraceMinutes: 15,
    cancelBeforeHours: 2,
    noShowDepositPolicy: 'forfeit',
  },
  bookingConfirmTip: '提交后请按时到店，如需改约可在「我的预约」中操作',
  verifyCodeNotice:
    '扫码方式：\n1. 店员在微信打开本店小程序\n2. 进入「店员端 → 扫码核销」\n3. 扫描上方二维码\n\n数字码仅供手动输入，请勿扫码',
  cardBuySubtitle: '充值享优惠，到店更省心',
  cardEmptyTip: '还没有会员卡，开通享更多优惠',
  cancelBookingTip: '确定取消该预约？已付订金将自动退还',
  slotsEmptyTip: '近 14 天暂无可预约日期，请稍后再试或联系门店',
  availabilityDays: 14,
  defaultServiceDescription:
    '精选优质项目，由专业技师为您提供舒适、细致的服务体验。欢迎在线预约，到店即享。',
  allowManualPhoneBind: false,
  theme: { ...DEFAULT_MINI_THEME },
};

export const VERIFY_CODE_SCAN_NOTICE =
  '使用步骤：\n1. 先选择要核销的会员卡\n2. 出示上方二维码，由店员在「店员端 → 扫码核销」扫描\n3. 店员选择对应项目后完成核销\n\n数字码仅供手动输入，请勿扫码';

const LEGACY_VERIFY_CODE_NOTICES = new Set([
  '请将核销码出示给店员扫码，或告知店员手动核销',
  '请出示上方二维码，由店员在小程序「扫码核销」；数字码仅供店员手动输入或后台核销',
  '扫码方式：店员在微信打开本店小程序 → 店员端 →「扫码核销」，扫描上方二维码。数字码仅供手动输入，请勿扫码。',
  '扫码方式：\n1. 店员在微信打开本店小程序\n2. 进入「店员端 → 扫码核销」\n3. 扫描上方二维码\n\n数字码仅供手动输入，请勿扫码',
]);

export function resolveVerifyCodeNotice(raw?: string) {
  const text = raw?.trim();
  if (!text || LEGACY_VERIFY_CODE_NOTICES.has(text)) {
    return VERIFY_CODE_SCAN_NOTICE;
  }
  return text;
}

export function mergeMiniDisplay(raw?: unknown): MiniDisplayConfig {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<MiniDisplayConfig>;
  return {
    ...DEFAULT_MINI_DISPLAY,
    ...input,
    verifyCodeNotice: resolveVerifyCodeNotice(input.verifyCodeNotice),
    quickActions: { ...DEFAULT_MINI_DISPLAY.quickActions, ...(input.quickActions || {}) },
    serviceHighlights:
      Array.isArray(input.serviceHighlights) && input.serviceHighlights.length
        ? input.serviceHighlights
        : DEFAULT_MINI_DISPLAY.serviceHighlights,
    bookingSteps:
      Array.isArray(input.bookingSteps) && input.bookingSteps.length
        ? input.bookingSteps
        : DEFAULT_MINI_DISPLAY.bookingSteps,
    bookingNotices:
      Array.isArray(input.bookingNotices) && input.bookingNotices.length
        ? input.bookingNotices
        : DEFAULT_MINI_DISPLAY.bookingNotices,
    bookingRules: {
      ...DEFAULT_MINI_DISPLAY.bookingRules,
      ...(input.bookingRules && typeof input.bookingRules === 'object' ? input.bookingRules : {}),
    },
    availabilityDays: Number(input.availabilityDays) || DEFAULT_MINI_DISPLAY.availabilityDays,
    allowManualPhoneBind: input.allowManualPhoneBind === true,
    theme: mergeShopTheme(input.theme),
  };
}
