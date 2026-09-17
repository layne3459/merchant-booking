import type { MiniHighlight } from './mini-display';

export interface ServiceDisplay {
  tags: string[];
  highlights: MiniHighlight[];
}

export function normalizeServiceTags(raw?: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => String(t).trim()).filter(Boolean);
}

export function normalizeServiceHighlights(raw?: unknown): MiniHighlight[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Partial<MiniHighlight>;
      const title = String(row.title || '').trim();
      if (!title) return null;
      return {
        icon: String(row.icon || '✨'),
        title,
        desc: String(row.desc || '').trim(),
      };
    })
    .filter((item): item is MiniHighlight => Boolean(item));
}

export function mergeServiceDisplay(
  service?: { tags?: unknown; highlights?: unknown },
  shopHighlights: MiniHighlight[] = [],
): ServiceDisplay {
  const tags = normalizeServiceTags(service?.tags);
  const highlights = normalizeServiceHighlights(service?.highlights);
  const fallbackHighlights = shopHighlights.length ? shopHighlights : [];
  return {
    tags: tags.length ? tags : fallbackHighlights.slice(0, 2).map((h) => h.title),
    highlights: highlights.length ? highlights : fallbackHighlights,
  };
}
