import { bookingStatusMap } from '@/utils/request';

type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'default';
export type CardDeductMode = 'balance' | 'times' | 'period';

export function bookingStatusTag(status: number): { text: string; type: TagType } {
  const text = bookingStatusMap[status] || '未知';
  const map: Record<number, TagType> = {
    0: 'warning',
    1: 'primary',
    2: 'success',
    3: 'default',
    4: 'danger',
    5: 'danger',
  };
  return { text, type: map[status] || 'default' };
}

export function serviceInitial(name?: string) {
  return (name || '服').slice(0, 1);
}

export function bookingStatusClass(status: number) {
  const map: Record<number, string> = {
    0: 'status--pending',
    1: 'status--booked',
    2: 'status--arrived',
    3: 'status--done',
    4: 'status--cancel',
    5: 'status--cancel',
  };
  return map[status] || 'status--done';
}

export function cardThemeClass(theme?: CardDeductMode | string) {
  const map: Record<string, string> = {
    balance: 'card--balance',
    times: 'card--times',
    period: 'card--period',
  };
  return map[theme || ''] || 'card--balance';
}

export function cardTypeLabel(item: { typeName?: string }) {
  return item.typeName || '会员卡';
}

function resolveDeductMode(item: { deductMode?: CardDeductMode; type?: number }): CardDeductMode {
  if (item.deductMode) return item.deductMode;
  if (item.type === 3) return 'period';
  if (item.type === 2) return 'times';
  return 'balance';
}

export function cardTemplateHighlight(
  item: { deductMode?: CardDeductMode; type?: number; value: number },
  fenToYuan: (n: number) => string,
) {
  const mode = resolveDeductMode(item);
  if (mode === 'times') return String(item.value);
  if (mode === 'period') return '∞';
  return fenToYuan(item.value);
}

export function cardTemplateHighlightUnit(item: { deductMode?: CardDeductMode; type?: number }) {
  const mode = resolveDeductMode(item);
  if (mode === 'times') return '次';
  if (mode === 'period') return '';
  return '元';
}

export function cardTemplateMeta(
  item: { deductMode?: CardDeductMode; type?: number; value: number; validDays: number },
  fenToYuan: (n: number) => string,
) {
  const mode = resolveDeductMode(item);
  if (mode === 'balance') return `充值到账 ¥${fenToYuan(item.value)} · ${item.validDays} 天有效`;
  if (mode === 'times') return `可核销 ${item.value} 次 · ${item.validDays} 天有效`;
  if (mode === 'period') return `${item.validDays} 天内畅享指定项目`;
  return `${item.validDays} 天有效`;
}
