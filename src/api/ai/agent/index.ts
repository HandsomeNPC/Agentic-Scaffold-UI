import type { AxiosPromise } from '@/utils/api-types';
import request from '@/utils/request';

import type { SnailOpenApiUser } from './types';

// 注册当前登录用户为 Snail AI 用户
export const registerCurrentSnailUser = (): AxiosPromise<SnailOpenApiUser> => {
  return request({ url: '/snail-ai/user/register', method: 'post' });
};
