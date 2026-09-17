import {
  type MiniHighlight,
  DEFAULT_MINI_DISPLAY,
  mergeMiniDisplay,
  type MiniDisplayConfig,
} from './shop-display';

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
  shopDisplay?: MiniDisplayConfig,
): ServiceDisplay {
  const shop = mergeMiniDisplay(shopDisplay);
  const tags = normalizeServiceTags(service?.tags);
  const highlights = normalizeServiceHighlights(service?.highlights);
  return {
    tags: tags.length ? tags : shop.serviceHighlights.slice(0, 2).map((h) => h.title),
    highlights: highlights.length ? highlights : shop.serviceHighlights,
  };
}

export { DEFAULT_MINI_DISPLAY };
