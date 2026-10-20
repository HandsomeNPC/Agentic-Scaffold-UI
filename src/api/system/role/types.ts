/** 部门树形结构（角色数据权限用） */
export interface DeptTreeOption {
  id: string | number;
  label: string;
  parentId: string | number;
  weight: number;
  children?: DeptTreeOption[];
}

export interface RoleDeptTree {
  checkedKeys: Array<string | number>;
  depts: DeptTreeOption[];
}

/** 角色视图对象 */
export interface RoleVO extends BaseEntity {
  roleId: string | number;
  roleName: string;
  roleKey: string;
  roleSort: number;
  dataScope: string;
  menuCheckStrictly: boolean;
  deptCheckStrictly: boolean;
  status: string;
  delFlag: string;
  remark?: string;
  flag: boolean;
  menuIds?: Array<string | number>;
  deptIds?: Array<string | number>;
  admin: boolean;
}

/** 角色查询参数 */
export interface RoleQuery extends PageQuery {
  roleName?: string;
  roleKey?: string;
  status?: string;
}

/** 角色表单 */
export interface RoleForm {
  roleName: string;
  roleKey: string;
  roleSort: number;
  status: string;
  menuCheckStrictly: boolean;
  deptCheckStrictly: boolean;
  remark: string;
  dataScope?: string;
  roleId: string | undefined;
  menuIds: Array<string | number>;
  deptIds: Array<string | number>;
}
