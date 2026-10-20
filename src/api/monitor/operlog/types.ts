export interface OperLogQuery extends PageQuery {
  operIp?: string;
  title?: string;
  operName?: string;
  businessType?: string;
  status?: string;
  clientKey?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  orderByColumn?: string;
  isAsc?: string;
}

export interface OperLogVO extends BaseEntity {
  operId: string | number;
  title: string;
  businessType: number;
  method: string;
  requestMethod: string;
  operatorType: number;
  operName: string;
  deptId: string | number;
  deptName: string;
  browser: string;
  os: string;
  clientKey: string;
  deviceType: string;
  operUrl: string;
  operIp: string;
  operLocation: string;
  operParam: string;
  jsonResult: string;
  status: number;
  errorMsg: string;
  operTime: string;
  costTime: number;
}
