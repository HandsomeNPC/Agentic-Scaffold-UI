/** 会话 */
export interface ThreadVo {
  threadId: string;
  title: string;
  agentType: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

/** AG-UI 中断 */
export interface AgentInterrupt {
  id: string;
  reason?: string;
  message?: string;
  toolCallId?: string;
}

/** /threads/render 出参：messages 是 AG-UI 历史消息 */
export interface RenderVo {
  threadId: string;
  messages: any[];
  interrupts: AgentInterrupt[];
  pendingApproval: boolean;
  running: boolean;
}

export interface AbortVo {
  aborted: boolean;
}

/** 恢复条目：interruptId 不传，后端从自己的快照按序配对 */
export interface ResumeEntry {
  status: 'resolved' | 'cancelled';
  payload?: unknown;
}
