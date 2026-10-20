// 合同状态枚举
export const CONTRACT_STATUS = {
  FAIL: 0,
  AUDIT_PENDING: 1,
  EXEC_PENDING: 2,
  EXECUTING: 3,
  FINISH: 4,
};

// 合同类型枚举
export const CONTRACT_TYPES = {
  MAIN: 0,
  SUB: 1,
  SUPPLEMENT: 2,
};

// 合同收付类型枚举
export const CONTRACT_PAYMENT_TYPES = {
  PAYMENT: 0,
  RECEIPT: 1,
};

// 标签类型
type TagTheme = 'default' | 'success' | 'primary' | 'warning' | 'danger';
// 通知的优先级对应的标签类型
export const NOTIFICATION_TYPES: Map<string, TagTheme> = new Map([
  ['low', 'primary'],
  ['middle', 'warning'],
  ['high', 'danger'],
]);

// 通用请求头
export enum ContentTypeEnum {
  Json = 'application/json;charset=UTF-8',
  FormURLEncoded = 'application/x-www-form-urlencoded;charset=UTF-8',
  FormData = 'multipart/form-data;charset=UTF-8',
}

/**
 * 超级管理员用户 ID（RuoYi-Plus 默认种子数据，雪花 ID 字符串）。
 * 用于在用户/角色列表中屏蔽对超管的状态切换、重置密码、删除等操作。
 * 与原项目一致：scope.row.userId !== '1761100000000000001'。
 */
export const SUPER_ADMIN_ID = '1761100000000000001';

export const isSuperAdmin = (userId: string | number | undefined | null): boolean => {
  return userId !== undefined && userId !== null && String(userId) === SUPER_ADMIN_ID;
};

/**
 * 超级管理员角色 ID（RuoYi-Plus 默认种子数据，雪花 ID 字符串）。
 * 用于在角色列表中屏蔽对超管角色的分配用户等操作。
 */
export const SUPER_ADMIN_ROLE_ID = '1761300000000000001';

export const isSuperAdminRole = (roleId: string | number | undefined | null): boolean => {
  return roleId !== undefined && roleId !== null && String(roleId) === SUPER_ADMIN_ROLE_ID;
};
