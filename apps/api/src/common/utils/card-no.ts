export function formatCardNo(id: number | string | bigint): string {
  const text = String(id).replace(/\D/g, '') || '0';
  return `NO.${text.padStart(8, '0').slice(-8)}`;
}
