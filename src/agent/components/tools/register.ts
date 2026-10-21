import type { AgentToolcallConfig } from '@tdesign-vue-next/chat';

import DemoToolCard from './DemoToolCard.vue';

/**
 * 注册工具渲染组件。name 与后端工具名一一对应。
 */
export const toolcallActions: AgentToolcallConfig[] = [
  {
    name: 'Demo',
    description: '下单购买奶茶，需要用户二次确认',
    parameters: [
      { name: 'flavor', type: 'string', required: true },
      { name: 'size', type: 'string', required: true },
      { name: 'sugar', type: 'string', required: true },
      { name: 'count', type: 'number', required: true },
    ],
    component: DemoToolCard as AgentToolcallConfig['component'],
  },
];
