import { normalizeNumericIds } from './numeric-ids';

export type CardDeductMode = 'balance' | 'times' | 'period';

export interface CardBenefitInput {
  deductMode: CardDeductMode;
  value: number;
  validDays: number;
  serviceNames?: string[];
}

export function buildCardBenefits(input: CardBenefitInput): string[] {
  const services = input.serviceNames?.length ? input.serviceNames.join('、') : '全部项目';
  const lines: string[] = [];

  if (input.deductMode === 'balance') {
    lines.push('核销时按项目原价从余额扣款');
    if (input.value > 0) {
      lines.push(`开卡到账 ${(input.value / 100).toFixed(2)} 元`);
    }
    lines.push(`适用项目：${services}`);
  } else if (input.deductMode === 'times') {
    lines.push(`每次核销扣 1 次，共 ${input.value} 次`);
    lines.push(`适用项目：${services}`);
  } else if (input.deductMode === 'period') {
    lines.push('有效期内可核销指定项目');
    lines.push(`适用项目：${services}`);
  }

  if (input.validDays > 0) {
    lines.push(`购卡后 ${input.validDays} 天内有效`);
  }

  return lines;
}

export function resolveServiceNames(
  serviceIds: unknown,
  serviceMap: Map<number, string>,
): string[] {
  const ids = normalizeNumericIds(serviceIds);
  if (!ids?.length) return [];
  return ids.map((id) => serviceMap.get(id)).filter((name): name is string => Boolean(name));
}
