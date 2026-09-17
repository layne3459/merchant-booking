export interface MiniThemeConfig {
  primaryColor: string;
  pageBackground: string;
  buttonBgColor: string;
  buttonTextColor: string;
  buttonBorderColor: string;
  buttonOutlineTextColor: string;
  titleColor: string;
  contentColor: string;
  secondaryColor: string;
}

export const DEFAULT_MINI_THEME: MiniThemeConfig = {
  primaryColor: '#a8845a',
  pageBackground: '#f5f3f0',
  buttonBgColor: '#a8845a',
  buttonTextColor: '#ffffff',
  buttonBorderColor: '#a8845a',
  buttonOutlineTextColor: '#a8845a',
  titleColor: '#2c2a26',
  contentColor: '#4a4640',
  secondaryColor: '#9a958c',
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function normalizeThemeColor(value: unknown, fallback: string): string {
  const text = String(value || '').trim();
  return HEX_COLOR.test(text) ? text : fallback;
}

export function mergeShopTheme(raw?: unknown): MiniThemeConfig {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<MiniThemeConfig>;
  const primaryColor = normalizeThemeColor(input.primaryColor, DEFAULT_MINI_THEME.primaryColor);
  const buttonBgColor = normalizeThemeColor(
    input.buttonBgColor,
    normalizeThemeColor(input.primaryColor, DEFAULT_MINI_THEME.buttonBgColor),
  );
  const buttonBorderColor = normalizeThemeColor(input.buttonBorderColor, buttonBgColor);
  return {
    primaryColor,
    pageBackground: normalizeThemeColor(input.pageBackground, DEFAULT_MINI_THEME.pageBackground),
    buttonBgColor,
    buttonTextColor: normalizeThemeColor(input.buttonTextColor, DEFAULT_MINI_THEME.buttonTextColor),
    buttonBorderColor,
    buttonOutlineTextColor: normalizeThemeColor(input.buttonOutlineTextColor, buttonBorderColor),
    titleColor: normalizeThemeColor(input.titleColor, DEFAULT_MINI_THEME.titleColor),
    contentColor: normalizeThemeColor(input.contentColor, DEFAULT_MINI_THEME.contentColor),
    secondaryColor: normalizeThemeColor(input.secondaryColor, DEFAULT_MINI_THEME.secondaryColor),
  };
}
