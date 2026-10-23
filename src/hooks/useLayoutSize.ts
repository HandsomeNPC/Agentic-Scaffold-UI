import { readonly, ref } from 'vue';

import cache from '@/plugins/cache';

/** 布局大小，见 style/size.less：在 <html> 上设 data-size 覆盖 TDesign 尺寸变量。 */
export type LayoutSize = 'large' | 'medium' | 'small';

const SIZE_KEY = 'layout-size';

export const LAYOUT_SIZE_OPTIONS: { label: string; value: LayoutSize }[] = [
  { label: '大', value: 'large' },
  { label: '中', value: 'medium' },
  { label: '小', value: 'small' },
];

export function isLayoutSize(v: unknown): v is LayoutSize {
  return LAYOUT_SIZE_OPTIONS.some((o) => o.value === v);
}

function initial(): LayoutSize {
  const saved = cache.local.get(SIZE_KEY);
  return isLayoutSize(saved) ? saved : 'medium';
}

// 模块级单例：顶栏的布局大小下拉与智能助手的 ChangeUISettings 工具改的是同一份，下拉的选中态才不会过期。
const current = ref<LayoutSize>(initial());

function apply(size: LayoutSize) {
  current.value = size;
  document.documentElement.setAttribute('data-size', size);
}

export function useLayoutSize() {
  return {
    layoutSize: readonly(current),
    /** 应用并持久化。 */
    setLayoutSize(size: LayoutSize) {
      apply(size);
      cache.local.set(SIZE_KEY, size);
    },
    /** 把已保存的值同步到 <html>，页面初始化时调用一次。 */
    restoreLayoutSize() {
      apply(current.value);
    },
  };
}
