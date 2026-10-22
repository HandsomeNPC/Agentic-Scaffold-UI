import type { AgentToolcallConfig } from '@tdesign-vue-next/chat';

import DemoToolCard from './demo/DemoToolCard.vue';
import GetCurrentUserToolCard from './system/GetCurrentUserToolCard.vue';
import GetMyMenusToolCard from './system/GetMyMenusToolCard.vue';
import GetMyMessagesToolCard from './system/GetMyMessagesToolCard.vue';
import GetMyPermissionsToolCard from './system/GetMyPermissionsToolCard.vue';
import LookupDictToolCard from './system/LookupDictToolCard.vue';

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
  {
    name: 'GetMyMessages',
    description: '查询当前登录用户最近 30 天的站内消息，按系统消息 / 通知公告 / 工作流分类',
    parameters: [
      { name: 'category', type: 'string', required: false },
      { name: 'limit', type: 'number', required: false },
    ],
    component: GetMyMessagesToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'GetMyPermissions',
    description: '查询当前登录用户的角色与权限码，或判断是否拥有某项权限',
    parameters: [{ name: 'permission', type: 'string', required: false }],
    component: GetMyPermissionsToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'GetMyMenus',
    description: '查询当前登录用户可见的目录与菜单，回答某功能在哪个菜单',
    parameters: [{ name: 'keyword', type: 'string', required: false }],
    component: GetMyMenusToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'LookupDict',
    description: '按字典类型查询字典选项，把编码值翻译成文字',
    parameters: [
      { name: 'dictType', type: 'string', required: true },
      { name: 'value', type: 'string', required: false },
    ],
    component: LookupDictToolCard as AgentToolcallConfig['component'],
  },
];
