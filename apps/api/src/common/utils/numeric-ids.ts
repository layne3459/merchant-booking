export function normalizeNumericId(value: unknown): number {
  const id = Number(value);
  return Number.isFinite(id) ? id : 0;
}

export function normalizeNumericIds(value: unknown): number[] | null {
  if (!Array.isArray(value) || !value.length) return null;
  const ids = [...new Set(value.map(normalizeNumericId).filter((id) => id > 0))];
  return ids.length ? ids : null;
}
