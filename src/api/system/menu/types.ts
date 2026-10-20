import type { MenuTypeEnum } from '@/enums';

/** 菜单树形结构 */
export interface MenuTreeOption {
  id: string | number;
  label: string;
  parentId: string | number;
  weight: number;
  menuType?: MenuTypeEnum | string;
  visible?: string;
  status?: string;
  disabled?: boolean;
  children?: MenuTreeOption[];
}

export interface RoleMenuTree {
  menus: MenuTreeOption[];
  checkedKeys: Array<string | number>;
}

/** 菜单查询参数 */
export interface MenuQuery {
  keywords?: string;
  menuName?: string;
  status?: string;
}

/** 菜单视图对象 */
export interface MenuVO extends BaseEntity {
  parentName: string;
  parentId: string | number;
  children: MenuVO[];
  menuId: string | number;
  menuName: string;
  orderNum: number;
  path: string;
  component: string;
  queryParam: string;
  isFrame: string;
  isCache: string;
  menuType: string;
  visible: string;
  status: string;
  icon: string;
  activeMenu: string;
  ext: string;
  remark: string;
  perms: string;
}

/** 菜单表单 */
export interface MenuForm {
  parentName?: string;
  parentId?: string | number;
  children?: MenuForm[];
  menuId?: string | number;
  menuName: string;
  orderNum: number;
  path: string;
  component?: string;
  queryParam?: string;
  isFrame?: string;
  isCache?: string;
  menuType?: string;
  visible?: string;
  status?: string;
  icon?: string;
  activeMenu?: string;
  ext?: string;
  remark?: string;
  query?: string;
  perms?: string;
}
