import type { PostVO } from '@/api/system/post/types';
import type { RoleVO } from '@/api/system/role/types';

/** 用户信息（getInfo 返回） */
export interface UserInfo {
  user: UserVO;
  roles: string[];
  permissions: string[];
}

/** 用户查询参数 */
export interface UserQuery extends PageQuery {
  userName?: string;
  nickName?: string;
  phoneNumber?: string;
  status?: string;
  deptId?: string | number;
  roleId?: string | number;
  userIds?: string | number | Array<string | number>;
}

/** 用户视图对象 */
export interface UserVO extends BaseEntity {
  userId: string | number;
  tenantId: string;
  deptId: number | string;
  userName: string;
  nickName: string;
  userType: string;
  email: string;
  phoneNumber: string;
  gender: string;
  avatar?: string | number;
  avatarUrl?: string;
  status: string;
  delFlag: string;
  loginIp: string;
  loginDate: string;
  remark: string;
  deptName: string;
  dept?: { deptName?: string };
  roles: RoleVO[];
  roleIds: any;
  postIds: any;
  roleId: any;
  admin: boolean;
}

/** 用户表单 */
export interface UserForm {
  id?: string;
  userId?: string;
  deptId?: number | string;
  userName: string;
  nickName?: string;
  password: string;
  phoneNumber?: string;
  email?: string;
  gender?: string;
  status: string;
  remark?: string;
  avatar?: string | number;
  postIds: Array<string | number>;
  roleIds: Array<string | number>;
}

/** 个人资料表单 */
export interface UserProfileForm {
  userName?: string;
  nickName?: string;
  phoneNumber?: string;
  email?: string;
  gender?: string;
  avatar?: string | number;
}

/** 用户详情（带角色/岗位集合） */
export interface UserInfoVO {
  user: UserVO;
  roles: RoleVO[];
  roleIds: string[];
  posts: PostVO[];
  postIds: string[];
  roleGroup: string;
  postGroup: string;
}

/** 修改密码表单 */
export interface ResetPwdForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
