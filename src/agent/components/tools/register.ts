import type { AgentToolcallConfig } from '@tdesign-vue-next/chat';

import DemoToolCard from './demo/DemoToolCard.vue';
import GetCurrentUserToolCard from './system/GetCurrentUserToolCard.vue';

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
  {
    name: 'GetCurrentUser',
    description: '查询当前登录用户的个人信息：账号、昵称、部门、角色、岗位、联系方式、最近登录',
    parameters: [],
    component: GetCurrentUserToolCard as AgentToolcallConfig['component'],
  },
];
