import type { ConfigProviderThemeVars } from 'wot-design-uni/components/wd-config-provider/types';
import { buildThemeVars, DEFAULT_MINI_THEME } from '@/utils/shop-theme';

/** @deprecated 请使用 useShopTheme() 或 shopStore.theme */
export const themeVars: ConfigProviderThemeVars = buildThemeVars(DEFAULT_MINI_THEME);

export { DEFAULT_MINI_THEME };
