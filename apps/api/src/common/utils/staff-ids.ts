/** JSON 列里的 staffIds 可能是 number 或 string，统一为 number[] */
export function normalizeStaffIds(raw: unknown): number[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const ids = raw
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  return ids.length ? ids : null;
}

export function isStaffAllowedForService(
  serviceStaffIds: unknown,
  staffId: number | bigint,
): boolean {
  const ids = normalizeStaffIds(serviceStaffIds);
  if (!ids?.length) return true;
  return ids.includes(Number(staffId));
}
