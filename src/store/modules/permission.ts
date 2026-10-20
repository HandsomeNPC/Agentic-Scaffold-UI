import cloneDeep from 'lodash/cloneDeep';
import { defineStore } from 'pinia';
import type { RouteRecordRaw } from 'vue-router';

import { getRouters } from '@/api/menu';
import router from '@/router';
import { store } from '@/store';
import { createCustomNameComponent } from '@/utils/createCustomNameComponent';
import { LAYOUT } from '@/utils/route/constant';
import { isHttp } from '@/utils/ruoyi';

// 后端菜单组件串 → 前端组件 映射
const ParentView = () => import('@/components/ParentView/index.vue');
const InnerLink = () => import('@/components/InnerLink/index.vue');
const EXCEPTION_COMPONENT = () => import('@/pages/result/500/index.vue');

// 预建 pages 下所有 .vue 查找表，避免每次扫描
const modules = import.meta.glob('./../../pages/**/*.vue');
const viewModuleMap = new Map<string, () => Promise<any>>();
// 大小写不敏感查找表：后端 component 串大小写可能与文件目录不完全一致
// （例如 monitor/logininfo/index 与目录 loginInfo），用小写键兜底
const viewModuleMapLower = new Map<string, () => Promise<any>>();
for (const path of Object.keys(modules)) {
  const idx = path.indexOf('/pages/');
  if (idx === -1) continue;
  const dir = path.substring(idx + 7, path.lastIndexOf('.vue'));
  const loader = modules[path] as () => Promise<any>;
  viewModuleMap.set(dir, loader);
  viewModuleMapLower.set(dir.toLowerCase(), loader);
}

function toLocalizedTitle(title: any) {
  if (title && typeof title === 'object') return title;
  if (typeof title === 'string' && title) return { zh_CN: title, en_US: title };
  return title;
}

function loadView(view: string, name?: string) {
  const v = view.replace(/^\//, '');
  // 1. 精确匹配
  // 2. 后端串不带 /index 时尝试补 /index
  // 3. 大小写不敏感（精确 + /index）
  // 兜底返回 500 异常组件
  const loader =
    viewModuleMap.get(v) ||
    viewModuleMap.get(`${v}/index`) ||
    viewModuleMapLower.get(v.toLowerCase()) ||
    viewModuleMapLower.get(`${v.toLowerCase()}/index`);
  if (!loader) return EXCEPTION_COMPONENT;
  // 用路由 name 包一层组件，使 <keep-alive :include> 能命中后端生成的 name
  if (name) {
    return createCustomNameComponent(loader, { name });
  }
  return loader;
}

/**
 * 遍历后台路由，把 component 字符串解析为组件对象
 *  - 'Layout'   → 主体 Layout（含侧边栏/Header/内容区）
 *  - 'ParentView' → 纯 <router-view/> 容器
 *  - 'InnerLink'  → 内嵌 iframe
 *  - 其它        → pages 下对应组件
 */
function processRoute(route: any, isTop: boolean) {
  if (!route.meta) route.meta = {};
  route.meta.title = toLocalizedTitle(route.meta.title);

  // RuoYi-Plus 后端 RouterVo.hidden 是顶层布尔字段（router.setHidden("1".equals(menu.getVisible()))），
  // meta 里只有 title/icon/noCache/link/activeMenu，没有 visible/status。
  // 这里把顶层 hidden 同步到 starter 侧边栏识别的 meta.hidden。
  if (route.hidden === true || route.hidden === '1') {
    route.meta.hidden = true;
  }
  // 兜底：个别后端版本仍把 visible/status 放在 meta 里
  const { visible, status } = route.meta;
  if (visible === '1' || visible === 1 || status === '1' || status === 1) {
    route.meta.hidden = true;
  }

  // RuoYi 用 meta.noCache 控制不缓存；starter Content.vue 用 meta.keepAlive（未定义=缓存）。
  // 把 noCache 映射成 keepAlive=false。
  if (route.meta.noCache === true || route.meta.noCache === 'true') {
    route.meta.keepAlive = false;
  }

  const comp = route.component?.toString();
  if (comp === 'Layout' || comp === 'LAYOUT') {
    route.component = LAYOUT;
  } else if (comp === 'ParentView') {
    route.component = ParentView;
  } else if (comp === 'InnerLink') {
    route.component = InnerLink;
  } else if (route.component) {
    route.component = loadView(route.component, route.name);
  }

  // 顶层 path 补前导斜杠，便于 starter 侧边栏直接拼接；
  // 外链（http(s)://）path 不能补斜杠，否则变成 /https://...
  if (isTop && route.path && !String(route.path).startsWith('/') && !isHttp(String(route.path))) {
    route.path = '/' + route.path;
  }

  if (route.children && route.children.length) {
    route.children.forEach((child: any) => processRoute(child, false));
  } else {
    delete route.children;
    delete route.redirect;
  }
}

function filterAsyncRouter(asyncRouterMap: any[]): RouteRecordRaw[] {
  return asyncRouterMap.filter((route) => {
    processRoute(route, true);
    return true;
  }) as unknown as RouteRecordRaw[];
}

// 侧边栏首页入口（后端菜单通常不包含首页）
const HOME_MENU = {
  path: '/index',
  name: 'Index',
  meta: {
    title: { zh_CN: '首页', en_US: '首页' },
    icon: 'dashboard',
    affix: true,
  },
  children: [],
};

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    whiteListRouters: ['/login'],
    routers: [] as Array<RouteRecordRaw>,
    removeRoutes: [] as Array<RouteRecordRaw>,
    asyncRoutes: [] as Array<RouteRecordRaw>,
  }),
  actions: {
    async initRoutes() {
      this.routers = cloneDeep([HOME_MENU, ...this.asyncRoutes]);
    },
    async buildAsyncRoutes() {
      const res = await getRouters();
      const data = Array.isArray(res?.data) ? res.data : [];
      const accessRoutes = filterAsyncRouter(cloneDeep(data));
      this.asyncRoutes = accessRoutes;
      await this.initRoutes();
      return accessRoutes;
    },
    async restoreRoutes() {
      this.asyncRoutes.forEach((item: RouteRecordRaw) => {
        if (item.name) router.removeRoute(item.name);
      });
      this.asyncRoutes = [];
      this.routers = [];
    },
  },
});

export function getPermissionStore() {
  return usePermissionStore(store);
}
