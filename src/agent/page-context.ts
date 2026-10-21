import { reactive } from 'vue';

import router from '@/router';

/**
 * 前端拥有的页面上下文，每轮随 /ai/threads/chat 上行（后端只读、不回写）。
 *
 * 只放「帮助模型理解用户在看什么」的信息。后端把它当不可信输入：
 * 只进提示词，不参与权限判断，选中行 ID 进工具后仍走数据权限校验。
 */
interface PageContext {
  /** 页面自报的上下文，按 key 覆盖，如 { selection: { type: 'user', ids: [...] } } */
  extras: Record<string, unknown>;
}

const ctx = reactive<PageContext>({ extras: {} });

/**
 * 业务页上报自己的上下文（如表格选中行）。传 undefined 撤销该 key。
 * 页面卸载时记得撤销，否则会把离开页面的选中项带进下一次对话。
 */
export function setPageContext(key: string, value: unknown) {
  if (value === undefined) {
    delete ctx.extras[key];
  } else {
    ctx.extras[key] = value;
  }
}

/** 拍一份本轮要上行的快照 */
export function snapshotPageContext() {
  const route = router.currentRoute.value;
  const title = route.meta?.title as Record<string, string> | string | undefined;
  return {
    page: {
      path: route.path,
      title: typeof title === 'string' ? title : title?.zh_CN,
      query: route.query,
    },
    ...ctx.extras,
  };
}
