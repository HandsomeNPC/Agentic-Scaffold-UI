import { ref } from 'vue';

import { addDateRange } from '@/utils/ruoyi';

/**
 * 日期范围查询 composable（移植自原项目 src/hooks/form/useDateRangeQuery.ts）。
 * dateRange 绑定到 t-date-range-picker（valueType='YYYY-MM-DD HH:mm:ss'，输出字符串数组）。
 * applyDateRange 把 begin/end 注入到 queryParams.params 上再发起查询。
 * @param propName 精确字段名前缀，如 'Time' → params.beginTime/endTime；'Login' → beginLoginTime/endLoginTime
 */
export function useDateRangeQuery(propName?: string) {
  const dateRange = ref<any>(['', '']);

  const applyDateRange = <T extends Record<string, any>>(queryParams: T) => {
    return addDateRange(queryParams, dateRange.value, propName);
  };

  const resetDateRange = () => {
    dateRange.value = ['', ''];
  };

  return {
    dateRange,
    applyDateRange,
    resetDateRange,
  };
}
