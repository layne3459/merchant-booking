export type CardDeductMode = 'balance' | 'times' | 'period';

export interface CardTypeDefinition {
  id: number;
  name: string;
  deductMode: CardDeductMode;
  /** 卡面配色，默认同 deductMode */
  theme: CardDeductMode;
  enabled: boolean;
}

export const CARD_DEDUCT_MODE_LABELS: Record<CardDeductMode, string> = {
  balance: '储值扣款（按项目原价扣余额）',
  times: '扣次数（每次核销扣 1 次）',
  period: '周期核销（有效期内可核销）',
};

export const DEFAULT_CARD_TYPES: CardTypeDefinition[] = [
  { id: 1, name: '储值卡', deductMode: 'balance', theme: 'balance', enabled: true },
  { id: 2, name: '次卡', deductMode: 'times', theme: 'times', enabled: true },
  { id: 3, name: '周期卡', deductMode: 'period', theme: 'period', enabled: true },
  { id: 4, name: '疗程卡', deductMode: 'times', theme: 'times', enabled: true },
  { id: 5, name: '体验卡', deductMode: 'times', theme: 'times', enabled: true },
  { id: 6, name: '套餐储值卡', deductMode: 'balance', theme: 'balance', enabled: true },
];

export function mergeCardTypes(raw?: unknown): CardTypeDefinition[] {
  if (!Array.isArray(raw) || !raw.length) {
    return DEFAULT_CARD_TYPES.map((item) => ({ ...item }));
  }

  const merged = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const input = item as Partial<CardTypeDefinition>;
      const deductMode = input.deductMode;
      if (deductMode !== 'balance' && deductMode !== 'times' && deductMode !== 'period') {
        return null;
      }
      const id = Number(input.id);
      const name = String(input.name || '').trim();
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      const theme = input.theme === 'balance' || input.theme === 'times' || input.theme === 'period'
        ? input.theme
        : deductMode;
      return {
        id,
        name,
        deductMode,
        theme,
        enabled: input.enabled !== false,
      } satisfies CardTypeDefinition;
    })
    .filter((item): item is CardTypeDefinition => Boolean(item));

  return merged.length ? merged.sort((a, b) => a.id - b.id) : DEFAULT_CARD_TYPES.map((item) => ({ ...item }));
}

export function getEnabledCardTypes(types: CardTypeDefinition[]): CardTypeDefinition[] {
  return types.filter((item) => item.enabled);
}

export function findCardType(types: CardTypeDefinition[], typeId: number): CardTypeDefinition | null {
  const id = Number(typeId);
  if (!Number.isFinite(id)) return null;
  return types.find((item) => item.id === id) ?? null;
}

export function resolveDeductMode(types: CardTypeDefinition[], typeId: number): CardDeductMode {
  return findCardType(types, typeId)?.deductMode ?? 'times';
}

export function resolveCardTheme(types: CardTypeDefinition[], typeId: number): CardDeductMode {
  return findCardType(types, typeId)?.theme ?? resolveDeductMode(types, typeId);
}

export function nextCardTypeId(types: CardTypeDefinition[]): number {
  const maxId = types.reduce((max, item) => Math.max(max, item.id), 0);
  return maxId + 1;
}
