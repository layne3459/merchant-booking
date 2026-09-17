export const DepositType = {
  NONE: 0,
  RATIO: 1,
  FIXED: 2,
} as const;

/** 项目预约订金默认比例（%），按比例收取时使用 */
export const DEFAULT_SERVICE_DEPOSIT_RATIO = 20;

export interface ServiceDepositInput {
  depositType?: number | null;
  depositRatio?: number | null;
  depositFixed?: number | null;
  price?: number | null;
}

/** 计算预约订金（分） */
export function calcServiceDeposit(service: ServiceDepositInput): number {
  const depositType = Number(service.depositType ?? DepositType.RATIO);
  const priceFen = Number(service.price ?? 0);

  if (depositType === DepositType.NONE) return 0;

  if (depositType === DepositType.FIXED) {
    const fixed = Number(service.depositFixed ?? 0);
    return fixed > 0 ? fixed : 0;
  }

  const percent =
    service.depositRatio === null || service.depositRatio === undefined
      ? DEFAULT_SERVICE_DEPOSIT_RATIO
      : Number(service.depositRatio);
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  const ratio = Math.min(percent, 100) / 100;
  if (priceFen <= 0) return 0;
  return Math.max(1, Math.round(priceFen * ratio));
}
