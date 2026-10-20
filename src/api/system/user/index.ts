import type { PageResult } from '@/api/types';
import type { AxiosPromise } from '@/utils/api-types';
import request from '@/utils/request';
import { parseStrEmpty } from '@/utils/ruoyi';

import type { DeptTreeVO } from '../dept/types';
import type { RoleVO } from '../role/types';
import type { UserForm, UserInfoVO, UserProfileForm, UserQuery, UserVO } from './types';

// 查询用户列表
export const listUser = (query: UserQuery): AxiosPromise<PageResult<UserVO>> => {
  return request({
    url: '/system/user/list',
    method: 'get',
    params: query,
  });
};

// 通过 userIds 查询用户
export const optionSelect = (userIds: Array<number | string>): AxiosPromise<UserVO[]> => {
  return request({
    url: '/system/user/optionselect?userIds=' + userIds,
    method: 'get',
  });
};

// 获取用户详情
export const getUser = (userId?: string | number): AxiosPromise<UserInfoVO> => {
  return request({
    url: '/system/user/' + parseStrEmpty(userId),
    method: 'get',
  });
};

// 新增用户
export const addUser = (data: UserForm) => {
  return request({
    url: '/system/user',
    method: 'post',
    data: data,
  });
};

// 修改用户
export const updateUser = (data: UserForm) => {
  return request({
    url: '/system/user',
    method: 'put',
    data: data,
  });
};

// 删除用户
export const delUser = (userId: Array<string | number> | string | number) => {
  return request({
    url: '/system/user/' + userId,
    method: 'delete',
  });
};

// 用户密码重置（管理员）
export const resetUserPwd = (userId: string | number, password: string) => {
  return request({
    url: '/system/user/resetPwd',
    method: 'put',
    headers: { isEncrypt: 'true', repeatSubmit: false },
    data: { userId, password },
  });
};

// 用户状态修改
export const changeUserStatus = (userId: number | string, status: string) => {
  return request({
    url: '/system/user/changeStatus',
    method: 'put',
    data: { userId, status },
  });
};

// 解锁用户
export const unlockUser = (userId: number | string) => {
  return request({
    url: '/system/user/unlock/' + userId,
    method: 'get',
  });
};

// 查询用户个人信息
export const getUserProfile = (): AxiosPromise<UserInfoVO> => {
  return request({
    url: '/system/user/profile',
    method: 'get',
  });
};

// 修改用户个人信息
export const updateUserProfile = (data: UserProfileForm) => {
  return request({
    url: '/system/user/profile',
    method: 'put',
    data: data,
  });
};

// 用户修改自身密码
export const updateUserPwd = (oldPassword: string, newPassword: string) => {
  return request({
    url: '/system/user/profile/updatePwd',
    method: 'put',
    headers: { isEncrypt: 'true', repeatSubmit: false },
    data: { oldPassword, newPassword },
  });
};

// 查询授权角色
export const getAuthRole = (userId: string | number): AxiosPromise<{ user: UserVO; roles: RoleVO[] }> => {
  return request({
    url: '/system/user/authRole/' + userId,
    method: 'get',
  });
};

// 保存授权角色
export const updateAuthRole = (data: { userId: string; roleIds: string }) => {
  return request({
    url: '/system/user/authRole',
    method: 'put',
    params: data,
  });
};

// 查询当前部门的所有用户信息
export const listUserByDeptId = (deptId: string | number): AxiosPromise<UserVO[]> => {
  return request({
    url: '/system/user/list/dept/' + deptId,
    method: 'get',
  });
};

// 查询部门下拉树结构
export const deptTreeSelect = (): AxiosPromise<DeptTreeVO[]> => {
  return request({
    url: '/system/user/deptTree',
    method: 'get',
  });
};

export default { deptTreeSelect };
