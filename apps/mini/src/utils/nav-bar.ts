export interface NavBarMetrics {
  statusBarHeight: number;
  navBarHeight: number;
  navBarTotal: number;
}

/** 自定义导航栏页面顶部安全区（状态栏 + 胶囊按钮区域） */
export function getNavBarMetrics(): NavBarMetrics {
  const sys = uni.getSystemInfoSync();
  const statusBarHeight = sys.statusBarHeight || 0;

  // #ifdef MP-WEIXIN
  const menu = uni.getMenuButtonBoundingClientRect();
  const navBarHeight = menu.height + (menu.top - statusBarHeight) * 2;
  // #endif

  // #ifndef MP-WEIXIN
  const navBarHeight = 44;
  // #endif

  return {
    statusBarHeight,
    navBarHeight,
    navBarTotal: statusBarHeight + navBarHeight,
  };
}
