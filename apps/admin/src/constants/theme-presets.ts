import { DEFAULT_MINI_THEME, mergeShopTheme, type MiniThemeConfig } from './shop-theme';

export type ThemePresetCategory = 'featured' | 'seasonal' | 'brand';

export type ThemePresetTab = ThemePresetCategory | 'custom';

export interface ThemePreset {
  id: string;
  name: string;
  desc: string;
  category: ThemePresetCategory;
  theme: MiniThemeConfig;
}

export const THEME_PRESET_CATEGORY_LABELS: Record<ThemePresetCategory, string> = {
  featured: '精选推荐',
  seasonal: '节气节日',
  brand: '大厂风格',
};

export const THEME_PRESET_TAB_LABELS: Record<ThemePresetTab, string> = {
  ...THEME_PRESET_CATEGORY_LABELS,
  custom: '自定义',
};

function theme(partial: Partial<MiniThemeConfig> & Pick<MiniThemeConfig, 'primaryColor'>): MiniThemeConfig {
  return mergeShopTheme(partial);
}

/** 一键配色方案：选好后再微调单项颜色 */
export const THEME_PRESETS: ThemePreset[] = [
  // —— 精选推荐 ——
  {
    id: 'classic-gold',
    name: '雅致金棕',
    desc: '美业门店默认，温润高级',
    category: 'featured',
    theme: { ...DEFAULT_MINI_THEME },
  },
  {
    id: 'minimal-mono',
    name: '简约黑白',
    desc: '克制干净，突出内容',
    category: 'featured',
    theme: theme({
      primaryColor: '#1a1a1a',
      pageBackground: '#f7f7f7',
      buttonBgColor: '#1a1a1a',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#1a1a1a',
      buttonOutlineTextColor: '#1a1a1a',
      titleColor: '#111111',
      contentColor: '#444444',
      secondaryColor: '#888888',
    }),
  },
  {
    id: 'soft-sage',
    name: '清新绿意',
    desc: 'SPA、养生、自然风',
    category: 'featured',
    theme: theme({
      primaryColor: '#5a8f7b',
      pageBackground: '#f4f8f5',
      buttonBgColor: '#5a8f7b',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#4a7d6a',
      buttonOutlineTextColor: '#4a7d6a',
      titleColor: '#1f3329',
      contentColor: '#3d5248',
      secondaryColor: '#7a9488',
    }),
  },
  {
    id: 'rose-blush',
    name: '温柔粉彩',
    desc: '美甲、美妆、女性向',
    category: 'featured',
    theme: theme({
      primaryColor: '#c97b84',
      pageBackground: '#fdf6f7',
      buttonBgColor: '#c97b84',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#b86a73',
      buttonOutlineTextColor: '#b86a73',
      titleColor: '#3d2428',
      contentColor: '#6b454c',
      secondaryColor: '#a8898e',
    }),
  },

  // —— 节气节日 ——
  {
    id: 'spring-bloom',
    name: '春日花开',
    desc: '3–5 月 · 踏青季',
    category: 'seasonal',
    theme: theme({
      primaryColor: '#e8919c',
      pageBackground: '#fff8f9',
      buttonBgColor: '#e07a88',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#d96b7a',
      buttonOutlineTextColor: '#d96b7a',
      titleColor: '#4a2c32',
      contentColor: '#6d454d',
      secondaryColor: '#b08a90',
    }),
  },
  {
    id: 'summer-breeze',
    name: '夏日清凉',
    desc: '6–8 月 · 清爽蓝',
    category: 'seasonal',
    theme: theme({
      primaryColor: '#3b9ddd',
      pageBackground: '#f0f8fd',
      buttonBgColor: '#2b8fd4',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#2b8fd4',
      buttonOutlineTextColor: '#2b8fd4',
      titleColor: '#123a52',
      contentColor: '#2d5a72',
      secondaryColor: '#6a9bb0',
    }),
  },
  {
    id: 'autumn-harvest',
    name: '金秋暖阳',
    desc: '9–11 月 · 落叶橙',
    category: 'seasonal',
    theme: theme({
      primaryColor: '#d4843c',
      pageBackground: '#fdf8f2',
      buttonBgColor: '#c9742e',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#b86828',
      buttonOutlineTextColor: '#b86828',
      titleColor: '#4a3018',
      contentColor: '#6d4f30',
      secondaryColor: '#a88a6a',
    }),
  },
  {
    id: 'winter-snow',
    name: '冬日雪景',
    desc: '12–2 月 · 冷冽蓝灰',
    category: 'seasonal',
    theme: theme({
      primaryColor: '#5b7c99',
      pageBackground: '#f4f7fa',
      buttonBgColor: '#4a6d8a',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#4a6d8a',
      buttonOutlineTextColor: '#4a6d8a',
      titleColor: '#1e2d3d',
      contentColor: '#3d5060',
      secondaryColor: '#7a8f9e',
    }),
  },
  {
    id: 'festival-cny',
    name: '春节喜庆',
    desc: '农历新年 · 红金',
    category: 'seasonal',
    theme: theme({
      primaryColor: '#c41e3a',
      pageBackground: '#fff5f5',
      buttonBgColor: '#c41e3a',
      buttonTextColor: '#fff8e7',
      buttonBorderColor: '#a81830',
      buttonOutlineTextColor: '#a81830',
      titleColor: '#5c1018',
      contentColor: '#7a2830',
      secondaryColor: '#b08080',
    }),
  },
  {
    id: 'festival-mid-autumn',
    name: '中秋月圆',
    desc: '中秋佳节 · 月黄',
    category: 'seasonal',
    theme: theme({
      primaryColor: '#c9a227',
      pageBackground: '#fffbf0',
      buttonBgColor: '#b8921f',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#a68318',
      buttonOutlineTextColor: '#a68318',
      titleColor: '#3d3010',
      contentColor: '#5c4a20',
      secondaryColor: '#9a8860',
    }),
  },
  {
    id: 'festival-christmas',
    name: '圣诞氛围',
    desc: '12 月 · 红绿',
    category: 'seasonal',
    theme: theme({
      primaryColor: '#2d6a4f',
      pageBackground: '#f5faf7',
      buttonBgColor: '#c1121f',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#2d6a4f',
      buttonOutlineTextColor: '#2d6a4f',
      titleColor: '#1b4332',
      contentColor: '#2d5a45',
      secondaryColor: '#6a9480',
    }),
  },
  {
    id: 'festival-valentine',
    name: '情人节',
    desc: '2 月 14 · 浪漫粉',
    category: 'seasonal',
    theme: theme({
      primaryColor: '#e84393',
      pageBackground: '#fef5fa',
      buttonBgColor: '#e84393',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#d63384',
      buttonOutlineTextColor: '#d63384',
      titleColor: '#4a1830',
      contentColor: '#6d3050',
      secondaryColor: '#b08098',
    }),
  },

  // —— 大厂风格（配色参考，非官方） ——
  {
    id: 'brand-wechat',
    name: '微信绿',
    desc: '社交生态 · 经典绿',
    category: 'brand',
    theme: theme({
      primaryColor: '#07c160',
      pageBackground: '#f7f7f7',
      buttonBgColor: '#07c160',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#06ad56',
      buttonOutlineTextColor: '#06ad56',
      titleColor: '#191919',
      contentColor: '#4c4c4c',
      secondaryColor: '#888888',
    }),
  },
  {
    id: 'brand-alipay',
    name: '支付宝蓝',
    desc: '支付信任 · 科技蓝',
    category: 'brand',
    theme: theme({
      primaryColor: '#1677ff',
      pageBackground: '#f5f8ff',
      buttonBgColor: '#1677ff',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#0958d9',
      buttonOutlineTextColor: '#0958d9',
      titleColor: '#141414',
      contentColor: '#434343',
      secondaryColor: '#8c8c8c',
    }),
  },
  {
    id: 'brand-meituan',
    name: '美团黄',
    desc: '本地生活 · 活力黄',
    category: 'brand',
    theme: theme({
      primaryColor: '#ffc300',
      pageBackground: '#fffdf5',
      buttonBgColor: '#ffc300',
      buttonTextColor: '#1a1a1a',
      buttonBorderColor: '#e6b000',
      buttonOutlineTextColor: '#b38600',
      titleColor: '#1a1a1a',
      contentColor: '#4a4a4a',
      secondaryColor: '#999999',
    }),
  },
  {
    id: 'brand-douyin',
    name: '抖音风',
    desc: '潮流暗黑 · 霓虹点缀',
    category: 'brand',
    theme: theme({
      primaryColor: '#fe2c55',
      pageBackground: '#161616',
      buttonBgColor: '#fe2c55',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#fe2c55',
      buttonOutlineTextColor: '#fe2c55',
      titleColor: '#ffffff',
      contentColor: '#cccccc',
      secondaryColor: '#888888',
    }),
  },
  {
    id: 'brand-xiaohongshu',
    name: '小红书红',
    desc: '种草社区 · 珊瑚红',
    category: 'brand',
    theme: theme({
      primaryColor: '#ff2442',
      pageBackground: '#fff8f8',
      buttonBgColor: '#ff2442',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#e61e3a',
      buttonOutlineTextColor: '#e61e3a',
      titleColor: '#1a1a1a',
      contentColor: '#4a4a4a',
      secondaryColor: '#999999',
    }),
  },
  {
    id: 'brand-jd',
    name: '京东红',
    desc: '电商促销 · 正红',
    category: 'brand',
    theme: theme({
      primaryColor: '#e1251b',
      pageBackground: '#fff8f7',
      buttonBgColor: '#e1251b',
      buttonTextColor: '#ffffff',
      buttonBorderColor: '#c41e17',
      buttonOutlineTextColor: '#c41e17',
      titleColor: '#1a1a1a',
      contentColor: '#434343',
      secondaryColor: '#8c8c8c',
    }),
  },
];

export function getThemePresetsByCategory(category: ThemePresetCategory): ThemePreset[] {
  return THEME_PRESETS.filter((item) => item.category === category);
}

export function findMatchingThemePreset(theme: MiniThemeConfig): string | null {
  const normalized = mergeShopTheme(theme);
  const hit = THEME_PRESETS.find((preset) => {
    const a = mergeShopTheme(preset.theme);
    return (Object.keys(a) as (keyof MiniThemeConfig)[]).every((key) => a[key] === normalized[key]);
  });
  return hit?.id ?? null;
}

export function applyThemePreset(preset: ThemePreset): MiniThemeConfig {
  return mergeShopTheme(preset.theme);
}
