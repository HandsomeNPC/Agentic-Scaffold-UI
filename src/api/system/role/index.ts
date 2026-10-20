import type { PageResult } from '@/api/types';
import type { AxiosPromise } from '@/utils/api-types';
import type { UserQuery, UserVO } from '@/api/system/user/types';
import request from '@/utils/request';

import type { RoleDeptTree, RoleForm, RoleQuery, RoleVO } from './types';

// 查询角色列表
export const listRole = (query: RoleQuery): AxiosPromise<PageResult<RoleVO>> => {
  return request({
    url: '/system/role/list',
    method: 'get',
    params: query,
  });
};

// 通过 roleIds 查询角色
export const optionSelect = (roleIds: Array<number | string>): AxiosPromise<RoleVO[]> => {
  return request({
    url: '/system/role/optionselect?roleIds=' + roleIds,
    method: 'get',
  });
};

// 查询角色详细
export const getRole = (roleId: string | number): AxiosPromise<RoleVO> => {
  return request({
    url: '/system/role/' + roleId,
    method: 'get',
  });
};

// 新增角色
export const addRole = (data: RoleForm) => {
  return request({
    url: '/system/role',
    method: 'post',
    data: data,
  });
};

// 修改角色基础信息
export const updateRole = (data: RoleForm) => {
  return request({
    url: '/system/role',
    method: 'put',
    data: data,
  });
};

// 修改角色权限（菜单权限 + 数据权限）
export const updateRolePermission = (data: {
  roleId: string | number;
  menuIds: Array<string | number>;
  deptIds?: Array<string | number>;
  dataScope?: string;
  menuCheckStrictly?: boolean;
  deptCheckStrictly?: boolean;
}) => {
  return request({
    url: '/system/role/permission',
    method: 'put',
    data: data,
  });
};

// 角色状态修改
export const changeRoleStatus = (roleId: string | number, status: string) => {
  return request({
    url: '/system/role/changeStatus',
    method: 'put',
    data: { roleId, status },
  });
};

// 删除角色
export const delRole = (roleId: Array<string | number> | string | number) => {
  return request({
    url: '/system/role/' + roleId,
    method: 'delete',
  });
};

// 根据角色 ID 查询部门树结构
export const deptTreeSelect = (roleId: string | number): AxiosPromise<RoleDeptTree> => {
  return request({
    url: '/system/role/deptTree/' + roleId,
    method: 'get',
  });
};

// 查询角色已授权用户列表
export const allocatedUserList = (query: UserQuery): AxiosPromise<PageResult<UserVO>> => {
  return request({ url: '/system/role/authUser/allocatedList', method: 'get', params: query });
};

// 查询角色未授权用户列表
export const unallocatedUserList = (query: UserQuery): AxiosPromise<PageResult<UserVO>> => {
  return request({ url: '/system/role/authUser/unallocatedList', method: 'get', params: query });
};

// 取消用户授权角色
export const authUserCancel = (data: { userId: string | number; roleId: string | number }) => {
  return request({ url: '/system/role/authUser/cancel', method: 'put', data });
};

// 批量取消用户授权角色
export const authUserCancelAll = (data: { roleId: string | number; userIds: string }) => {
  return request({ url: '/system/role/authUser/cancelAll', method: 'put', params: data });
};

// 批量授权用户选择
export const authUserSelectAll = (data: { roleId: string | number; userIds: string }) => {
  return request({ url: '/system/role/authUser/selectAll', method: 'put', params: data });
};

export default { optionSelect, listRole };
