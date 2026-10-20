import type { AxiosPromise } from '@/utils/api-types';
import request from '@/utils/request';

import type { TreeForm, TreeQuery, TreeVO } from './types';

// 查询测试树列表（返回扁平数组，前端组装树）
export function listTree(query?: TreeQuery): AxiosPromise<TreeVO[]> {
  return request({
    url: '/demo/tree/list',
    method: 'get',
    params: query,
  });
}

// 查询测试树详细
export function getTree(id: string | number): AxiosPromise<TreeVO> {
  return request({
    url: '/demo/tree/' + id,
    method: 'get',
  });
}

// 新增测试树
export function addTree(data: TreeForm) {
  return request({
    url: '/demo/tree',
    method: 'post',
    data: data,
  });
}

// 修改测试树
export function updateTree(data: TreeForm) {
  return request({
    url: '/demo/tree',
    method: 'put',
    data: data,
  });
}

// 删除测试树
export function delTree(id: string | number | Array<string | number>) {
  return request({
    url: '/demo/tree/' + id,
    method: 'delete',
  });
}
