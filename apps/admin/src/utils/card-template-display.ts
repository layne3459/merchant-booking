import { buildCardBenefits, type CardDeductMode } from './card-benefits';
import { fenToYuan, formatCardTemplateNo, normalizeNumericId, normalizeNumericIds } from './format';

export interface CardTemplateDisplayInput {
  id: number;
  name: string;
  typeName?: string;
  deductMode?: CardDeductMode;
  price: number;
  value: number;
  validDays: number;
  serviceIds?: number[] | null;
  status?: number;
}

export function templateValueText(template: Pick<CardTemplateDisplayInput, 'deductMode' | 'value'>) {
  if (template.deductMode === 'balance') return `¥${fenToYuan(template.value)}`;
  if (template.deductMode === 'period') return '有效期内';
  return `${template.value} 次`;
}

export function templateOptionLabel(template: CardTemplateDisplayInput) {
  return `${formatCardTemplateNo(template.id)} ${template.name}（${template.typeName || '会员卡'} · ${templateValueText(template)} · ${template.validDays}天 · 售价¥${fenToYuan(template.price)}）`;
}

export function templateBenefitLines(
  template: CardTemplateDisplayInput,
  services: Array<{ id: number; name: string }>,
) {
  const ids = new Set(normalizeNumericIds(template.serviceIds));
  return buildCardBenefits({
    deductMode: template.deductMode ?? 'times',
    value: template.value,
    validDays: template.validDays,
    serviceNames: services.filter((s) => ids.has(normalizeNumericId(s.id))).map((s) => s.name),
  });
}

export function templateBenefitText(
  template: CardTemplateDisplayInput,
  services: Array<{ id: number; name: string }>,
) {
  return templateBenefitLines(template, services).join('；');
}

export function listActiveTemplates<T extends { status?: number }>(templates: T[]) {
  return templates.filter((item) => item.status === 1);
}
