import type { AxiosPromise } from '@/utils/api-types';
import { closePush } from '@/utils/push';
import request from '@/utils/request';

import type { LoginData, LoginResult, RegisterForm, VerifyCodeResult } from './types';

// pc 端固定客户端授权 id
const clientId = import.meta.env.VITE_APP_CLIENT_ID;

/**
 * 登录
 * @param data {LoginData}
 */
export function login(data: LoginData): AxiosPromise<LoginResult> {
  const params = {
    ...data,
    clientId: data.clientId || clientId,
    grantType: data.grantType || 'password',
  };
  return request({
    url: '/auth/login',
    headers: {
      isToken: false,
      isEncrypt: 'true',
      repeatSubmit: false,
    },
    method: 'post',
    data: params,
  });
}

/**
 * 注销（同时关闭本地推送连接，并通知后端回收 SSE 连接）
 */
export function logout() {
  closePush();
  if (
    import.meta.env.VITE_APP_MESSAGE_ENABLED === 'true' &&
    (import.meta.env.VITE_APP_MESSAGE_TRANSPORT || 'sse').toLowerCase() === 'sse'
  ) {
    request({
      url: (import.meta.env.VITE_APP_MESSAGE_PATH || '/resource/message') + '/close',
      method: 'get',
    }).catch(() => {});
  }
  return request({
    url: '/auth/logout',
    method: 'post',
  });
}

/**
 * 注册
 */
export function register(data: RegisterForm) {
  const params = {
    ...data,
    clientId,
    grantType: 'password',
  };
  return request({
    url: '/auth/register',
    headers: {
      isToken: false,
      isEncrypt: 'true',
      repeatSubmit: false,
    },
    method: 'post',
    data: params,
  });
}

/**
 * 获取验证码
 */
export function getCodeImg(): AxiosPromise<VerifyCodeResult> {
  return request({
    url: '/auth/code',
    headers: {
      isToken: false,
    },
    method: 'get',
    timeout: 20000,
  });
}

/**
 * 第三方登录回调
 */
export function callback(data: LoginData): AxiosPromise<LoginResult> {
  const params = {
    ...data,
    clientId,
    grantType: 'social',
  };
  return request({
    url: '/auth/social/callback',
    method: 'post',
    data: params,
  });
}

/**
 * 获取用户详细信息
 */
export function getInfo(): AxiosPromise<{
  user: {
    userId: string | number;
    userName: string;
    nickName: string;
    avatarUrl?: string;
    [key: string]: any;
  };
  roles: string[];
  permissions: string[];
}> {
  return request({
    url: '/system/user/getInfo',
    method: 'get',
  });
}
