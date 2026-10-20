export interface TreeVO {
  id: number | string;
  parentId: number | string;
  deptId: number | string;
  userId: number | string;
  treeName: string;
  children: TreeVO[];
}

export interface TreeForm {
  id: number | string | undefined;
  parentId: number | string | undefined;
  deptId: number | string | undefined;
  userId: number | string | undefined;
  treeName: string;
}

export interface TreeQuery {
  parentId?: number | string;
  deptId?: number | string;
  userId?: number | string;
  treeName?: string;
}
