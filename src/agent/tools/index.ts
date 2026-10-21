import SubAgentCard from '../components/cards/SubAgentCard.vue';
import UserListCard from '../components/cards/UserListCard.vue';
import { navigateTool } from './navigate';
import { registerAgentTool } from './registry';

/**
 * 工具卡片登记。名字与后端工具 / 子智能体名一一对应。
 * 新增需要审批的工具时，只需在这里登记一个卡片 —— 中断传递链路不用改。
 */
export function setupAgentTools() {
  registerAgentTool(navigateTool);
  // 子智能体（Supervisor 上的 AgentTool），名字取后端 agent.AgentNameSystem
  registerAgentTool({ name: 'SystemAgent', component: SubAgentCard });
  registerAgentTool({ name: 'list_users', component: UserListCard });
}

export * from './registry';
