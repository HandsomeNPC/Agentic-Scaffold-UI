export interface OssVO extends BaseEntity {
  ossId: string | number;
  fileName: string;
  originalName: string;
  fileSuffix: string;
  url: string;
  createByName: string;
  service: string;
}

export interface OssUploadVO {
  url: string;
  fileName: string;
  ossId: string;
}

export interface OssQuery extends PageQuery {
  fileName?: string;
  originalName?: string;
  fileSuffix?: string;
  service?: string;
  orderByColumn?: string;
  isAsc?: string;
}

export interface OssForm {
  file: undefined | string;
}
