import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { LoginData } from '@/api/types';
import { getInfo as getInfoApi, login as loginApi, logout as logoutApi } from '@/api/login';
import { getToken, removeToken, setToken } from '@/utils/auth';

import { getPermissionStore } from './permission';
import { getTabsRouterStore } from './tabs-router';

/**
 * 用户信息（与原项目 user store 字段一致）
 */
export const useUserStore = defineStore('user', () => {
  const token = ref(getToken() ?? '');
  const name = ref('');
  const nickname = ref('');
  const userId = ref<string | number>('');
  const avatar = ref('');
  // 用户角色编码集合 → 判断路由权限
  const roles = ref<Array<string>>([]);
  // 用户权限编码集合 → 判断按钮权限
  const permissions = ref<Array<string>>([]);

  // 兼容 starter Header.vue 读取 user.userInfo.name / roles
  const userInfo = computed(() => ({
    name: nickname.value || name.value || '用户',
    roles: roles.value,
  }));

  /**
   * 登录
   */
  const login = async (loginData: LoginData): Promise<void> => {
    const res = await loginApi(loginData);
    const data = res?.data;
    if (!data?.access_token) {
      throw new Error('登录失败：未返回 token');
    }
    setToken(data.access_token);
    token.value = data.access_token;
  };

  /**
   * 获取用户信息
   */
  const getInfo = async (): Promise<void> => {
    const res = await getInfoApi();
    const data = res?.data;
    if (!data?.user) {
      throw new Error('获取用户信息失败');
    }
    const user = data.user;
    if (data.roles && data.roles.length > 0) {
      roles.value = data.roles;
      permissions.value = data.permissions;
    } else {
      roles.value = ['ROLE_DEFAULT'];
    }
    name.value = user.userName;
    nickname.value = user.nickName;
    avatar.value = user.avatarUrl ?? '';
    userId.value = user.userId;
  };

  /**
   * 注销：清理 token、用户信息，以及上一个账号的动态路由与多标签页
   * （登录走 router.push 不刷新页面，不清理会导致切换账号后侧边栏/路由残留）
   */
  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } catch {
      // 忽略登出接口失败，确保本地状态被清理
    }
    token.value = '';
    name.value = '';
    nickname.value = '';
    avatar.value = '';
    userId.value = '';
    roles.value = [];
    permissions.value = [];
    removeToken();
    await getPermissionStore().restoreRoutes();
    getTabsRouterStore().removeTabRouterList();
  };

  const setAvatar = (value: string) => {
    avatar.value = value;
  };

  return {
    token,
    name,
    nickname,
    userId,
    avatar,
    roles,
    permissions,
    userInfo,
    login,
    getInfo,
    logout,
    setAvatar,
  };
});
