export interface OssConfigVO extends BaseEntity {
  ossConfigId: string | number;
  configKey: string;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  prefix: string;
  /** 访问站点（@NotBlank 必填） */
  endpoint: string;
  /** 自定义域名 */
  domainUrl: string;
  isHttps: string;
  region: string;
  status: string;
  ext1?: string;
  remark?: string;
  /** 桶权限类型：0=private 1=public 2=custom */
  accessPolicy: string;
}

export interface OssConfigForm {
  ossConfigId?: string | number;
  configKey: string;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  prefix: string;
  endpoint: string;
  domainUrl: string;
  isHttps: string;
  accessPolicy: string;
  region: string;
  status: string;
  remark: string;
}

export interface OssConfigQuery extends PageQuery {
  configKey?: string;
  bucketName?: string;
  status?: string;
}
