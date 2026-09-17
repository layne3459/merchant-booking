/* eslint-disable */
/* prettier-ignore */

import type { GeneratedRoute } from '@elegant-router/types';

export const generatedRoutes: GeneratedRoute[] = [
  {
    name: '403',
    path: '/403',
    component: 'layout.blank$view.403',
    meta: {
      title: '403',
      constant: true,
      hideInMenu: true,
      i18nKey: 'route.403'
    }
  },
  {
    name: '404',
    path: '/404',
    component: 'layout.blank$view.404',
    meta: {
      title: '404',
      constant: true,
      hideInMenu: true,
      i18nKey: 'route.404'
    }
  },
  {
    name: '500',
    path: '/500',
    component: 'layout.blank$view.500',
    meta: {
      title: '500',
      constant: true,
      hideInMenu: true,
      i18nKey: 'route.500'
    }
  },
  {
    name: 'bookings',
    path: '/bookings',
    component: 'layout.base$view.bookings',
    meta: {
      title: '预约管理',
      icon: 'mdi:calendar-clock',
      order: 2,
      i18nKey: 'route.bookings',
      roles: ['owner', 'manager']
    }
  },
  {
    name: 'card-templates',
    path: '/card-templates',
    component: 'layout.base$view.card-templates',
    meta: {
      title: '卡种管理',
      icon: 'mdi:card-account-details',
      order: 7,
      i18nKey: 'route.card-templates',
      roles: ['owner', 'manager']
    }
  },
  {
    name: 'dashboard',
    path: '/dashboard',
    component: 'layout.base$view.dashboard',
    meta: {
      title: '仪表盘',
      icon: 'mdi:view-dashboard',
      order: 1,
      i18nKey: 'route.dashboard',
      roles: ['owner', 'manager']
    }
  },
  {
    name: 'iframe-page',
    path: '/iframe-page/:url',
    component: 'layout.base$view.iframe-page',
    props: true,
    meta: {
      title: 'iframe-page',
      hideInMenu: true,
      i18nKey: 'route.iframe-page'
    }
  },
  {
    name: 'login',
    path: '/login/:module(pwd-login|code-login|register|reset-pwd|bind-wechat)?',
    component: 'layout.blank$view.login',
    props: true,
    meta: {
      title: 'login',
      constant: true,
      hideInMenu: true,
      i18nKey: 'route.login'
    }
  },
  {
    name: 'members',
    path: '/members',
    component: 'layout.base$view.members',
    meta: {
      title: '会员管理',
      icon: 'mdi:account-group',
      order: 3,
      i18nKey: 'route.members',
      roles: ['owner', 'manager']
    }
  },
  {
    name: 'platform',
    path: '/platform',
    component: 'layout.base$view.platform',
    meta: {
      title: '平台开店',
      icon: 'mdi:store-plus',
      order: 0,
      i18nKey: 'route.platform',
      roles: ['platform']
    }
  },
  {
    name: 'schedules',
    path: '/schedules',
    component: 'layout.base$view.schedules',
    meta: {
      title: '排班管理',
      icon: 'mdi:calendar-month',
      order: 6,
      i18nKey: 'route.schedules',
      roles: ['owner', 'manager']
    }
  },
  {
    name: 'services',
    path: '/services',
    component: 'layout.base$view.services',
    meta: {
      title: '项目管理',
      icon: 'mdi:briefcase-outline',
      order: 4,
      i18nKey: 'route.services',
      roles: ['owner', 'manager']
    }
  },
  {
    name: 'settings',
    path: '/settings',
    component: 'layout.base$view.settings',
    meta: {
      title: '店铺设置',
      icon: 'mdi:cog',
      order: 9,
      i18nKey: 'route.settings',
      roles: ['owner', 'manager']
    }
  },
  {
    name: 'staff',
    path: '/staff',
    component: 'layout.base$view.staff',
    meta: {
      title: '员工管理',
      icon: 'mdi:account-tie',
      order: 5,
      i18nKey: 'route.staff',
      roles: ['owner', 'manager']
    }
  },
  {
    name: 'transactions',
    path: '/transactions',
    component: 'layout.base$view.transactions',
    meta: {
      title: '流水查询',
      icon: 'mdi:cash-multiple',
      order: 8,
      i18nKey: 'route.transactions',
      roles: ['owner', 'manager']
    }
  }
];
