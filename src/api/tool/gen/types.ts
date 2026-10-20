export interface TableVO extends BaseEntity {
  tableId: string | number;
  dataName: string;
  tableName: string;
  tableComment: string;
  className: string;
  tplCategory: string;
  frontendType: string;
  packageName: string;
  moduleName: string;
  businessName: string;
  functionName: string;
  functionAuthor: string;
  subTableName?: string;
  remark?: string;
  createTime?: string;
}

export interface TableQuery extends PageQuery {
  tableName?: string;
  tableComment?: string;
  dataName?: string;
}

export interface DbTableVO {
  tableName: string;
  tableComment: string;
  createTime?: string;
}

export interface DbTableQuery extends PageQuery {
  tableName?: string;
  tableComment?: string;
  dataName?: string;
}

export interface DbColumnVO {
  columnId?: any;
  columnName?: string;
  columnComment?: string;
  columnType?: string;
  javaType?: string;
  javaField?: string;
  isPk?: string;
  isInsert?: string;
  isEdit?: string;
  isList?: string;
  isQuery?: string;
  htmlType?: string;
  dictType?: string;
  sort?: number;
}

export type GenTableDetailPayload = {
  table: any;
  rows: DbColumnVO[];
};

/** 代码生成表配置表单（编辑配置用，核心流程暂不使用完整字段） */
export interface DbTableForm {
  tableId?: string | number;
  dataName?: string;
  tableName?: string;
  tableComment?: string;
  className?: string;
  tplCategory?: string;
  frontendType?: string;
  packageName?: string;
  moduleName?: string;
  businessName?: string;
  functionName?: string;
  functionAuthor?: string;
  remark?: string;
  [key: string]: any;
}

/** 预览代码：文件名 → 文件内容 */
export type PreviewResult = Record<string, string>;
