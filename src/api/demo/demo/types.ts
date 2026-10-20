export interface DemoVO {
  id: number | string;
  deptId: number | string;
  userId: number | string;
  orderNum: number;
  testKey: string;
  value: string;
}

export interface DemoForm {
  id: number | string | undefined;
  deptId: number | string | undefined;
  userId: number | string | undefined;
  orderNum: number | undefined;
  testKey: string;
  value: string;
}

export interface DemoQuery extends PageQuery {
  deptId?: number | string;
  userId?: number | string;
  orderNum?: number;
  testKey?: string;
  value?: string;
}
