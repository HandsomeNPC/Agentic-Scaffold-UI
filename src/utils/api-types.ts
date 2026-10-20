/**
 * 与 `src/utils/request` 拦截器一致：resolve 的是若依风格 JSON `{ code, msg, data }`。
 */
export interface RuoYiAjaxResult<T = unknown> {
  code?: number;
  msg?: string;
  data?: T;
}

export type AxiosPromise<T = unknown> = Promise<RuoYiAjaxResult<T>>;
