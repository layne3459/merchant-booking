export const DepositType = {
  NONE: 0,
  RATIO: 1,
  FIXED: 2,
} as const;

export function calcServiceDepositAmount(
  priceFen: number,
  depositType: number,
  depositRatio: number,
  depositFixed: number,
): number {
  if (depositType === DepositType.NONE) return 0;
  if (depositType === DepositType.FIXED) return depositFixed > 0 ? depositFixed : 0;
  const percent = depositRatio > 0 ? depositRatio : 20;
  if (priceFen <= 0 || percent <= 0) return 0;
  return Math.max(1, Math.round(priceFen * (Math.min(percent, 100) / 100)));
}
