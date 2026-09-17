export function fenToYuan(fen: number) {
  return (fen / 100).toFixed(2);
}

export function normalizeNumericId(value: unknown): number {
  const id = Number(value);
  return Number.isFinite(id) ? id : 0;
}

export function normalizeNumericIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeNumericId).filter((id) => id > 0))];
}

export function formatMemberNickname(member: {
  id?: string | number | bigint | null;
  nickname?: string | null;
  phone?: string | null;
}) {
  const nickname = member.nickname?.trim();
  if (nickname && nickname !== '微信用户') return nickname;
  if (member.phone?.trim()) return member.phone.trim();
  const id = member.id != null ? String(member.id) : '';
  if (id) return `用户${id.slice(-4).padStart(4, '0')}`;
  return '新用户';
}

export function formatMemberPhone(phone?: string | null) {
  return phone?.trim() || '未绑定';
}

export function formatCardNo(id: number | string | bigint) {
  const text = String(id).replace(/\D/g, '') || '0';
  return `NO.${text.padStart(8, '0').slice(-8)}`;
}

export function formatCardTemplateNo(id: number | string | bigint) {
  const text = String(id).replace(/\D/g, '') || '0';
  return `KT${text.padStart(6, '0').slice(-6)}`;
}

export const bookingStatusMap: Record<number, string> = {
  0: '待支付',
  1: '已预约',
  2: '已到店',
  3: '已完成',
  4: '已取消',
  5: '爽约',
};

export const bookingStatusType: Record<number, 'warning' | 'primary' | 'info' | 'success' | 'danger'> = {
  0: 'warning',
  1: 'primary',
  2: 'info',
  3: 'success',
  4: 'info',
  5: 'danger',
};

export const cardTypeMap: Record<number, string> = {
  1: '储值卡',
  2: '次卡',
  3: '周期卡',
};
