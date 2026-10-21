import { MessagePlugin } from 'tdesign-vue-next';

import router from '@/router';

import NavigateCard from '../components/cards/NavigateCard.vue';
import type { AgentToolDef } from './registry';

export interface NavigateArgs {
  path: string;
  query?: Record<string, string>;
}

/**
 * navigate：后端定义、前端执行。后端只回执「已打开」，真正的跳转在这里。
 * 路径由模型生成，必须 router.resolve 兜底 —— 落到 404 兜底路由就拒绝，不乱跳。
 */
export const navigateTool: AgentToolDef<NavigateArgs> = {
  name: 'navigate',
  component: NavigateCard,
  execute: async ({ path, query }) => {
    if (!path) return { ok: false, message: '未提供页面路径' };
    const target = router.resolve({ path, query });
    if (target.name === 'NotFound' || target.matched.length === 0) {
      MessagePlugin.warning(`页面不存在或无权访问：${path}`);
      return { ok: false, message: `页面不存在或无权访问：${path}` };
    }
    await router.push(target);
    return { ok: true, message: `已打开 ${path}` };
  },
};
