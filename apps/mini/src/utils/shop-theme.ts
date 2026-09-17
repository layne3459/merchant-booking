import type { ConfigProviderThemeVars } from 'wot-design-uni/components/wd-config-provider/types';
import {
  DEFAULT_MINI_THEME,
  mergeShopTheme,
  type MiniThemeConfig,
} from '@/utils/shop-display';

export type { MiniThemeConfig };

export interface ShopThemePalette extends MiniThemeConfig {
  primaryLight: string;
  primaryDark: string;
  heroMid: string;
  heroDark: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(a: string, b: string, weight: number) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  const w = clamp(weight, 0, 1);
  return rgbToHex(
    c1.r * (1 - w) + c2.r * w,
    c1.g * (1 - w) + c2.g * w,
    c1.b * (1 - w) + c2.b * w,
  );
}

export function lightenHex(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex);
  const ratio = percent / 100;
  return rgbToHex(r + (255 - r) * ratio, g + (255 - g) * ratio, b + (255 - b) * ratio);
}

export function darkenHex(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex);
  const ratio = 1 - percent / 100;
  return rgbToHex(r * ratio, g * ratio, b * ratio);
}

export function buildThemePalette(theme: MiniThemeConfig = DEFAULT_MINI_THEME): ShopThemePalette {
  const merged = mergeShopTheme(theme);
  return {
    ...merged,
    primaryLight: lightenHex(merged.primaryColor, 16),
    primaryDark: darkenHex(merged.primaryColor, 10),
    heroMid: mixHex('#3d3530', merged.primaryColor, 0.45),
    heroDark: '#3d3530',
  };
}

export function buildThemeVars(theme: MiniThemeConfig = DEFAULT_MINI_THEME): ConfigProviderThemeVars {
  const palette = buildThemePalette(theme);
  return {
    colorTheme: palette.primaryColor,
    colorBg: palette.pageBackground,
    colorTitle: palette.titleColor,
    colorContent: palette.contentColor,
    colorSecondary: palette.secondaryColor,
    buttonPrimaryBgColor: palette.buttonBgColor,
    buttonPrimaryColor: palette.buttonTextColor,
    buttonLargeRadius: '44px',
    buttonMediumRadius: '40px',
    cardRadius: '16px',
    cardShadowColor: 'rgba(44, 42, 38, 0.08)',
    tabbarActiveColor: palette.primaryColor,
    tabbarInactiveColor: palette.secondaryColor,
    calendarActiveColor: palette.primaryColor,
    tabsNavActiveColor: palette.primaryColor,
    tabsNavLineBgColor: palette.primaryColor,
  };
}

export function buildThemeStyle(theme: MiniThemeConfig = DEFAULT_MINI_THEME) {
  const palette = buildThemePalette(theme);
  return {
    '--mb-primary': palette.primaryColor,
    '--mb-primary-light': palette.primaryLight,
    '--mb-primary-dark': palette.primaryDark,
    '--mb-page-bg': palette.pageBackground,
    '--mb-btn-bg': palette.buttonBgColor,
    '--mb-btn-text': palette.buttonTextColor,
    '--mb-btn-border': palette.buttonBorderColor,
    '--mb-btn-outline-text': palette.buttonOutlineTextColor,
    '--mb-title': palette.titleColor,
    '--mb-content': palette.contentColor,
    '--mb-secondary': palette.secondaryColor,
    '--mb-hero-mid': palette.heroMid,
    '--mb-hero-dark': palette.heroDark,
  } as Record<string, string>;
}

/** 主按钮 inline 样式（绕过小程序内 config-provider 对 slot 内容不生效的问题） */
export function buildPrimaryButtonStyle(theme: MiniThemeConfig = DEFAULT_MINI_THEME) {
  const palette = mergeShopTheme(theme);
  return `background:${palette.buttonBgColor};color:${palette.buttonTextColor};border-color:${palette.buttonBgColor}`;
}

export function buildOutlineButtonStyle(theme: MiniThemeConfig = DEFAULT_MINI_THEME) {
  const palette = mergeShopTheme(theme);
  return `color:${palette.buttonOutlineTextColor};border-color:${palette.buttonBorderColor};background:transparent`;
}

/** 供 page-meta 注入整页 CSS 变量（小程序 page 节点） */
export function buildPageStyleStr(theme: MiniThemeConfig = DEFAULT_MINI_THEME) {
  const palette = buildThemePalette(theme);
  const vars = buildThemeStyle(theme);
  const parts = Object.entries(vars).map(([key, value]) => `${key}:${value}`);
  parts.push(`background-color:${palette.pageBackground}`);
  return parts.join(';');
}

export function applyRuntimeTheme(theme: MiniThemeConfig = DEFAULT_MINI_THEME) {
  const palette = buildThemePalette(theme);
  // #ifdef MP-WEIXIN
  try {
    uni.setTabBarStyle({
      selectedColor: palette.primaryColor,
      color: palette.secondaryColor,
      backgroundColor: '#ffffff',
      borderStyle: 'white',
    });
  } catch {
    // 非 Tab 页或开发者工具偶发失败时忽略
  }
  // #endif
}

export { mergeShopTheme, DEFAULT_MINI_THEME };
