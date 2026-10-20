import 'nprogress/nprogress.css';

import NProgress from 'nprogress';
import { MessagePlugin } from 'tdesign-vue-next';

import router from '@/router';
import { getPermissionStore, useUserStore } from '@/store';
import { getToken } from '@/utils/auth';
import { isHandledRequestError, isRelogin } from '@/utils/request';
import { filterExternalRoutes } from '@/utils/ruoyi';
import { closePush, initMessageBox, initPush } from '@/utils/push';

NProgress.configure({ showSpinner: false });

// 与原项目对齐：注册页、三方登录回调页未登录时也要能访问
const whiteList = ['/login', '/register', '/social-callback'];

const isWhiteList = (path: string) => {
  if (whiteList.includes(path)) return true;
  // 兼容 /register/<step> 形式
  if (path.startsWith('/register')) return true;
  return false;
};

// Vue Router 5：守卫返回值而非调用 next(value)
router.beforeEach(async (to, _from) => {
  NProgress.start();

  if (getToken()) {
    /* has token */
    if (to.path === '/login') {
      return { path: '/' };
    }
    try {
      const userStore = useUserStore();
      const permissionStore = getPermissionStore();

      // 判断当前用户是否已拉取完 user_info 信息
      if (userStore.roles.length === 0) {
        // 带过期 token 刷新页面时，getInfo 会 401：先置 isRelogin 抑制拦截器的重新登录弹窗，
        // 由下方 catch 统一跳登录页，避免「跳登录页 + 弹过期提示」双重打扰
        isRelogin.show = true;
        try {
          await userStore.getInfo();
          // 启动统一消息推送（SSE/WebSocket，仅首次进入时初始化）
          initMessageBox();
          initPush();
        } finally {
          isRelogin.show = false;
        }
      }

      // 根据权限生成可访问的路由表
      if (permissionStore.asyncRoutes.length === 0) {
        const accessRoutes = await permissionStore.buildAsyncRoutes();
        // 过滤掉 path 为外链(http(s)://)的路由：外链由侧边栏 MenuContent 用 window.open 打开，
        // 注册为真实路由会触发 vue-router "Route paths should start with a '/'" 警告。
        // sidebar 仍使用完整的 permissionStore.routers（含外链），不受此过滤影响。
        filterExternalRoutes(accessRoutes).forEach((route) => {
          router.addRoute(route);
        });
        // hack：确保 addRoute 完成后重新匹配，分开传 path/query/hash 避免 fullPath 字符串丢参数
        return { path: to.path, query: to.query, hash: to.hash, replace: true };
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isHandledRequestError(error)) {
        MessagePlugin.error(message);
      }
      closePush();
      await useUserStore().logout();
      NProgress.done();
      return { path: '/login', query: { redirect: encodeURIComponent(to.fullPath || '/') } };
    }
  }

  // 没有 token
  if (isWhiteList(to.path)) {
    return true;
  }
  NProgress.done();
  return { path: '/login', query: { redirect: to.fullPath } };
});

router.afterEach((to, _from) => {
  NProgress.done();
  // 动态浏览器标题：首页显示系统名，其余「页面标题 - 系统名」
  const appTitle = import.meta.env.VITE_APP_TITLE || 'RuoYi-Vue-Plus后台管理系统';
  const matched = to.matched;
  let pageTitle: string | undefined;
  for (let i = matched.length - 1; i >= 0; i--) {
    const t = matched[i].meta?.title as any;
    if (t && typeof t === 'object') pageTitle = t.zh_CN || t.en_US;
    else if (typeof t === 'string' && t) pageTitle = t;
    if (pageTitle) break;
  }
  document.title = pageTitle ? `${pageTitle} - ${appTitle}` : appTitle;
});
