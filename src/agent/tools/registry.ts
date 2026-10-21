import type { Component } from 'vue';

/** 一次工具调用在消息里的形状（TDesign AGUI 适配器产出的 toolcall-* 内容的 data） */
export interface ToolCallData {
  toolCallId: string;
  toolCallName: string;
  /** 参数 JSON 串（流式期间可能不完整） */
  args?: string;
  /** 工具结果原文（后端 TOOL_CALL_RESULT.content） */
  result?: string;
  eventType?: string;
}

/** 卡片组件拿到的 props */
export interface ToolCardProps<TArgs = any> {
  toolCall: ToolCallData;
  args: TArgs;
  /** 结果已解析成对象（解析失败时为原文） */
  result?: unknown;
  /** pending 参数流式中 / executing 等待结果 / complete 已有结果 / interrupted 待人工确认 */
  status: 'pending' | 'executing' | 'complete' | 'interrupted';
  /** 仅 interrupted 时有：中断文案 */
  interruptMessage?: string;
  /** 仅 interrupted 时有：提交审批结果，触发 resume */
  respond?: (approved: boolean, payload?: unknown) => void;
}

export interface AgentToolDef<TArgs = any> {
  name: string;
  /** 卡片组件；不提供则用通用卡片 */
  component?: Component;
  /**
   * 前端执行逻辑（如 navigate 的 router.push）。
   * 只对本次页面会话里实时流下来的调用执行一次，历史回放不执行。
   */
  execute?: (args: TArgs) => Promise<unknown> | unknown;
}

const registry = new Map<string, AgentToolDef>();

export function registerAgentTool(def: AgentToolDef) {
  registry.set(def.name, def);
}

export function getAgentTool(name: string) {
  return registry.get(name);
}

/**
 * 「本次页面会话里实时流下来」的 toolCallId。
 *
 * 为什么需要它：回填历史（setMessages）会把旧 tool call 重新渲染一遍，若卡片挂载就执行，
 * 切会话 / 刷新后历史里的 navigate 会再跳一次。只有实时 SSE 里见过 TOOL_CALL_START 的才执行。
 * 不用 TDesign 的非交互 handler 正是因为这点：它在回填时同样会被 immediate watch 触发，且拿不到 toolCallId。
 */
const liveToolCalls = new Set<string>();
const executed = new Map<string, Promise<unknown>>();

export function markLiveToolCall(toolCallId: string) {
  liveToolCalls.add(toolCallId);
}

/** 执行前端工具：仅实时调用、且每个调用只执行一次。返回 null 表示不执行（历史回放）。 */
export function runToolOnce(def: AgentToolDef, toolCallId: string, args: unknown): Promise<unknown> | null {
  if (!def.execute || !liveToolCalls.has(toolCallId)) return null;
  let p = executed.get(toolCallId);
  if (!p) {
    p = Promise.resolve().then(() => def.execute!(args));
    executed.set(toolCallId, p);
  }
  return p;
}
