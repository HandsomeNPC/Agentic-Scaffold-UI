import type { InjectionKey, Ref } from 'vue';

/**
 * 对话是否正在进行（pending / streaming），由 AgentPanel provide。
 *
 * 带副作用的工具卡片（如 NavigateToMenu 自动跳转）靠它区分「本轮实时返回」与「从展示快照恢复」：
 * 恢复走 setMessages，此时对话空闲；卡片挂载时已是 complete，单看 status 分不出来。
 */
export const agentBusyKey: InjectionKey<Readonly<Ref<boolean>>> = Symbol('agentBusy');
