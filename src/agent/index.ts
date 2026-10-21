/**
 * 智能体前端：全局悬浮对话框（与后端 Supervisor 对话）、工具卡片、页面上下文上报。
 * 方案见仓库根目录 COPILOT-PLAN.md。
 */
export { default as AgentSideBar } from './components/AgentSideBar.vue';
export { setPageContext } from './page-context';
export { registerAgentTool } from './tools';
