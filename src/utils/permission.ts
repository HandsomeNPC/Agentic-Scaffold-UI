import { useUserStore } from '@/store/modules/user';

/**
 * 字符权限校验
 * @param value 权限数组
 * @returns 是否通过
 */
export const checkPermi = (value: any): boolean => {
  if (value && value instanceof Array && value.length > 0) {
    const permissions = useUserStore().permissions;
    const all_permission = '*:*:*';

    const hasPermission = permissions.some((permission) => {
      return all_permission === permission || value.includes(permission);
    });

    return hasPermission;
  }
  console.error(`need roles! Like checkPermi="['system:user:add','system:user:edit']"`);
  return false;
};

/**
 * 角色权限校验
 * @param value 角色数组
 * @returns 是否通过
 */
export const checkRole = (value: any): boolean => {
  if (value && value instanceof Array && value.length > 0) {
    const roles = useUserStore().roles;
    const super_admin = 'admin';

    const hasRole = roles.some((role) => {
      return super_admin === role || value.includes(role);
    });

    return hasRole;
  }
  console.error(`need roles! Like checkRole="['admin','editor']"`);
  return false;
};
