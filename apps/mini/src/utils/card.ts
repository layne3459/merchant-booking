export function formatCardNo(id: number | string | bigint) {
  const text = String(id).replace(/\D/g, '') || '0';
  return `NO.${text.padStart(8, '0').slice(-8)}`;
}

export function formatCardTemplateNo(id: number | string | bigint) {
  const text = String(id).replace(/\D/g, '') || '0';
  return `KT${text.padStart(6, '0').slice(-6)}`;
}
