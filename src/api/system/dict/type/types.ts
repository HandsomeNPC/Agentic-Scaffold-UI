/** 字典类型展示对象 */
export interface DictTypeVO extends BaseEntity {
  dictId: number | string;
  dictName: string;
  dictType: string;
  remark: string;
}

/** 字典类型表单 */
export interface DictTypeForm {
  dictId: number | string | undefined;
  dictName: string;
  dictType: string;
  remark: string;
}

/** 字典类型查询参数 */
export interface DictTypeQuery extends PageQuery {
  dictName: string;
  dictType: string;
}
