import { computed } from 'vue';
import { useShopStore } from '@/stores/shop';
import {
  applyRuntimeTheme,
  buildPageStyleStr,
  buildPrimaryButtonStyle,
  buildOutlineButtonStyle,
  buildThemePalette,
  buildThemeStyle,
  buildThemeVars,
} from '@/utils/shop-theme';

export function useShopTheme() {
  const shopStore = useShopStore();
  const palette = computed(() => buildThemePalette(shopStore.theme));
  const themeStyle = computed(() => buildThemeStyle(shopStore.theme));
  const pageStyleStr = computed(() => buildPageStyleStr(shopStore.theme));
  const primaryButtonStyle = computed(() => buildPrimaryButtonStyle(shopStore.theme));
  const outlineButtonStyle = computed(() => buildOutlineButtonStyle(shopStore.theme));
  const themeVars = computed(() => buildThemeVars(shopStore.theme));
  const primaryColor = computed(() => palette.value.primaryColor);

  function refreshRuntimeTheme() {
    applyRuntimeTheme(shopStore.theme);
  }

  return {
    palette,
    themeStyle,
    pageStyleStr,
    primaryButtonStyle,
    outlineButtonStyle,
    themeVars,
    primaryColor,
    refreshRuntimeTheme,
  };
}
