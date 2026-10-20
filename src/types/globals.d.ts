// 通用声明

// Vue
declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<object, object, any>;
  export default component;
}

declare type ClassName = { [className: string]: any } | ClassName[] | string;

declare module '*.svg' {
  const CONTENT: string;
  export default CONTENT;
}

// vite-plugin-svg-icons-ng 副作用导入
declare module 'virtual:svg-icons-register';

declare type Recordable<T = any> = Record<string, T>;

/** 标签主题类型（兼容 ElementPlus 的 ElTagType 命名，业务页迁移时可映射到 TDesign 标签主题） */
declare type ElTagType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | '';

/** 分页查询参数 */
interface PageQuery {
  pageNum: number;
  pageSize: number;
}

/** 实体基类（后端通用审计字段） */
interface BaseEntity {
  createBy?: any;
  createDept?: any;
  createTime?: string;
  updateBy?: any;
  updateTime?: string;
}

/** 字典数据配置 */
interface DictDataOption {
  label: string;
  value: string;
  elTagType?: ElTagType;
  elTagClass?: string;
}
