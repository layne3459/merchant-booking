/** 项目预约订金默认比例（%） */
export const DEFAULT_SERVICE_DEPOSIT_RATIO = 20;

export const DepositType = {
  NONE: 0,
  RATIO: 1,
  FIXED: 2,
} as const;

export function calcServiceDepositPreview(
  priceYuan: number,
  depositType: number,
  depositRatio: number,
  depositFixedYuan: number,
): string {
  const priceFen = Math.round(priceYuan * 100);
  if (depositType === DepositType.NONE) return '0.00';
  if (depositType === DepositType.FIXED) {
    return depositFixedYuan > 0 ? depositFixedYuan.toFixed(2) : '0.00';
  }
  const percent = depositRatio > 0 ? depositRatio : DEFAULT_SERVICE_DEPOSIT_RATIO;
  const amountFen = Math.max(1, Math.round(priceFen * (percent / 100)));
  return (amountFen / 100).toFixed(2);
}
