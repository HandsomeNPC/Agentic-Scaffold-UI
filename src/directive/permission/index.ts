import type { Directive, DirectiveBinding } from 'vue';

import { useUserStore } from '@/store/modules/user';

/**
 * 操作权限处理 v-hasPermi="['system:user:add']"
 */
export const hasPermi: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { permissions } = useUserStore();
    const { value } = binding;
    if (value && value instanceof Array && value.length > 0) {
      const hasPermission = permissions.some((permi: string) => {
        return permi === '*:*:*' || value.includes(permi);
      });
      if (!hasPermission) {
        el.parentNode && el.parentNode.removeChild(el);
        return false;
      }
    } else {
      throw new Error("check perms! Like v-hasPermi=\"['system:user:add','system:user:edit']\"");
    }
  },
};

/**
 * 角色权限处理 v-hasRoles="['admin']"
 */
export const hasRoles: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding;
    const { roles } = useUserStore();
    if (value && value instanceof Array && value.length > 0) {
      const hasRole = roles.some((role: string) => {
        return role === 'superadmin' || role === 'admin' || value.includes(role);
      });
      if (!hasRole) {
        el.parentNode && el.parentNode.removeChild(el);
        return false;
      }
    } else {
      throw new Error("check roles! Like v-hasRoles=\"['admin','test']\"");
    }
  },
};
