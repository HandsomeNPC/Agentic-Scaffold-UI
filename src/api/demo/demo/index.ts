import type { AxiosPromise } from '@/utils/api-types';
import type { PageResult } from '@/api/types';
import request from '@/utils/request';

import type { DemoForm, DemoQuery, DemoVO } from './types';

// 查询测试单列表
export function listDemo(query: DemoQuery): AxiosPromise<PageResult<DemoVO>> {
  return request({
    url: '/demo/demo/list',
    method: 'get',
    params: query,
  });
}

// 查询测试单详细
export function getDemo(id: string | number): AxiosPromise<DemoVO> {
  return request({
    url: '/demo/demo/' + id,
    method: 'get',
  });
}

// 新增测试单
export function addDemo(data: DemoForm) {
  return request({
    url: '/demo/demo',
    method: 'post',
    data: data,
  });
}

// 修改测试单
export function updateDemo(data: DemoForm) {
  return request({
    url: '/demo/demo',
    method: 'put',
    data: data,
  });
}

// 删除测试单
export function delDemo(id: string | number | Array<string | number>) {
  return request({
    url: '/demo/demo/' + id,
    method: 'delete',
  });
}
