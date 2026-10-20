import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

import { LAYOUT } from '@/utils/route/constant';

/**
 * Note: 路由配置项（与原项目一致）
 *
 * hidden: true          该路由不在侧边栏出现
 * alwaysShow: true      始终显示根路由
 * redirect: noRedirect   在面包屑中不可点击
 * name: 'router-name'    路由名（keep-alive 必填）
 * meta : {
 *   title: 'title'       侧边栏/面包屑标题
 *   icon: 'svg-name'     图标
 *   noCache: true        不被 keep-alive 缓存
 *   link: 'url'         InnerLink 内嵌 iframe 地址
 *   activeMenu: '/xx'    高亮的侧边栏项
 * }
 */

// 公共路由（无需权限）
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/login/index.vue'),
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/register/index.vue'),
  },
  {
    path: '/401',
    name: 'NoAuth',
    component: () => import('@/pages/error/401.vue'),
  },
  {
    path: '/social-callback',
    name: 'SocialCallback',
    component: () => import('@/pages/social-callback/index.vue'),
  },
  {
    path: '/redirect',
    component: LAYOUT,
    children: [
      {
        path: '/redirect/:path(.*)',
        component: () => import('@/components/Redirect/index.vue'),
      },
    ],
  },
  {
    path: '/',
    component: LAYOUT,
    redirect: '/index',
    children: [
      {
        path: '/index',
        name: 'Index',
        component: () => import('@/pages/index/index.vue'),
        meta: { title: { zh_CN: '首页', en_US: '首页' }, icon: 'dashboard', affix: true },
      },
    ],
  },
  {
    path: '/user',
    component: LAYOUT,
    redirect: '/user/profile',
    children: [
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/pages/system/user/profile/index.vue'),
        meta: { title: { zh_CN: '个人中心', en_US: 'Profile' }, icon: 'user', breadcrumb: false },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/result/404/index.vue'),
  },
];

// 动态路由，基于用户权限动态加载
export const dynamicRoutes: RouteRecordRaw[] = [];

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_APP_CONTEXT_PATH || '/'),
  routes: constantRoutes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

// 计算当前激活的菜单层级路径（供 Header / 侧边栏高亮）
export const getActive = (maxLevel = 3): string => {
  const route = router.currentRoute.value;
  // 隐藏子页面（如分配角色）通过 meta.activeMenu 指定要高亮的父菜单
  const activeMenu = route.meta?.activeMenu as string | undefined;
  const raw = activeMenu || route.path;
  if (!raw) return '';
  return raw
    .split('/')
    .filter((_item: string, index: number) => index <= maxLevel && index > 0)
    .map((item: string) => `/${item}`)
    .join('');
};

export default router;
