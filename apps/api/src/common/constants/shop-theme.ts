export interface MiniThemeConfig {
  /** 品牌主色（强调、Tab 选中、图标等） */
  primaryColor: string;
  /** 页面背景色 */
  pageBackground: string;
  /** 实心主按钮背景色 */
  buttonBgColor: string;
  /** 实心主按钮文字色 */
  buttonTextColor: string;
  /** 线框按钮边框色（默认同 buttonBgColor） */
  buttonBorderColor: string;
  /** 线框按钮文字色（默认同 buttonBorderColor） */
  buttonOutlineTextColor: string;
  /** 标题文字色 */
  titleColor: string;
  /** 正文文字色 */
  contentColor: string;
  /** 次要/说明文字色 */
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
