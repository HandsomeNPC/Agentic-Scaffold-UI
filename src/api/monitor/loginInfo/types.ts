export interface LoginInfoVO {
  infoId: string | number;
  userName: string;
  status: string;
  ipaddr: string;
  loginLocation: string;
  browser: string;
  os: string;
  clientKey: string;
  deviceType: string;
  msg: string;
  loginTime: string;
}

export interface LoginInfoQuery extends PageQuery {
  ipaddr?: string;
  userName?: string;
  status?: string;
  clientKey?: string;
  deviceType?: string;
  orderByColumn?: string;
  isAsc?: string;
}
