import { useUserStore } from '@/store/modules/user';

const all_permission = '*:*:*';
const super_admin = 'admin';

const authPermission = (permission: string): boolean => {
  const permissions: string[] = useUserStore().permissions;
  if (permission && permission.length > 0) {
    return permissions.some((v) => all_permission === v || v === permission);
  }
  return false;
};

const authRole = (role: string): boolean => {
  const roles: string[] = useUserStore().roles;
  if (role && role.length > 0) {
    return roles.some((v) => super_admin === v || v === role);
  }
  return false;
};

export default {
  /** 验证用户是否具备某权限 */
  hasPermi(permission: string): boolean {
    return authPermission(permission);
  },
  /** 验证用户是否含有指定权限，只需包含其中一个 */
  hasPermiOr(permissions: string[]): boolean {
    return permissions.some((item) => authPermission(item));
  },
  /** 验证用户是否含有指定权限，必须全部拥有 */
  hasPermiAnd(permissions: string[]): boolean {
    return permissions.every((item) => authPermission(item));
  },
  /** 验证用户是否具备某角色 */
  hasRole(role: string): boolean {
    return authRole(role);
  },
  /** 验证用户是否含有指定角色，只需包含其中一个 */
  hasRoleOr(roles: string[]): boolean {
    return roles.some((item) => authRole(item));
  },
  /** 验证用户是否含有指定角色，必须全部拥有 */
  hasRoleAnd(roles: string[]): boolean {
    return roles.every((item) => authRole(item));
  },
};
