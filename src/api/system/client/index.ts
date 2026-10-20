import type { PageResult } from '@/api/types';
import type { AxiosPromise } from '@/utils/api-types';
import request from '@/utils/request';

import type { ClientForm, ClientQuery, ClientVO } from './types';

// 查询客户端列表
export const listClient = (query?: ClientQuery): AxiosPromise<PageResult<ClientVO>> => {
  return request({ url: '/system/client/list', method: 'get', params: query });
};

// 查询客户端详细
export const getClient = (id: string | number): AxiosPromise<ClientVO> => {
  return request({ url: '/system/client/' + id, method: 'get' });
};

// 新增客户端
export const addClient = (data: ClientForm) => {
  return request({ url: '/system/client', method: 'post', data: data });
};

// 修改客户端
export const updateClient = (data: ClientForm) => {
  return request({ url: '/system/client', method: 'put', data: data });
};

// 删除客户端
export const delClient = (id: string | number | Array<string | number>) => {
  return request({ url: '/system/client/' + id, method: 'delete' });
};

// 状态修改
export function changeStatus(clientId: string, status: string) {
  return request({
    url: '/system/client/changeStatus',
    method: 'put',
    data: { clientId, status },
  });
}
