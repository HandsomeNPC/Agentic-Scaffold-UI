/** 字典数据查询参数 */
export interface DictDataQuery extends PageQuery {
  dictName?: string;
  dictType?: string;
  dictLabel?: string;
}

/** 字典数据展示对象 */
export interface DictDataVO extends BaseEntity {
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  cssClass: string;
  listClass: ElTagType;
  dictSort: number;
  remark: string;
}

/** 字典数据表单 */
export interface DictDataForm {
  dictType?: string;
  dictCode: string | undefined;
  dictLabel: string;
  dictValue: string;
  cssClass: string;
  listClass: ElTagType;
  dictSort: number;
  remark: string;
}
