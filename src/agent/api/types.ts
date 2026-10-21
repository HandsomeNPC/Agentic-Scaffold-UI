/** 会话元信息。GET/POST /ai/threads 的返回体（对齐后端 vo.AiThreadVo） */
export interface ThreadVo {
  threadId: string;
  title: string;
  agentType: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

/** 会话列表查询条件，对齐后端 bo.AiThreadQueryBo + PageQuery。空值后端不筛。 */
export interface ThreadQuery {
  pageNum?: number;
  pageSize?: number;
  /** 标题，模糊匹配 */
  title?: string;
  /** Agent 类型，精确匹配 */
  agentType?: string;
}

export type ResumeStatus = 'resolved' | 'cancelled';

/** 中断恢复条目，对齐后端 bo.ChatRequest.Resume []types.ResumeEntry */
export interface ResumeEntry {
  interruptId?: string;
  status: ResumeStatus;
  payload?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * /render 返回的历史消息。
 *
 * 原样喂给 `AGUIAdapter.convertHistoryMessages`，这里只声明用得到的字段，
 * 不复刻整个 AG-UI 消息联合类型。
 */
export interface AGUIHistoryMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool' | 'reasoning' | 'developer' | 'activity';
  content?: unknown;
  toolCalls?: unknown[];
  toolCallId?: string;

  [key: string]: unknown;
}

/** 一个待用户确认的中断。 */
export interface AGUIInterrupt {
  id: string;
  reason?: string;
  message?: string;
  toolCallId?: string;
  responseSchema?: Record<string, unknown>;
  expiresAt?: string;
  subagentRunId?: string;
  metadata?: Record<string, unknown>;
}

/** POST /ai/threads/render 的返回体 */
export interface RenderVo {
  threadId: string;
  messages: AGUIHistoryMessage[];
  /** 是否存在待确认的审批。与 `interrupts.length > 0` 等价。 */
  pendingApproval: boolean;
  /**
   * 待确认的中断详情。
   *
   * 后端只在 checkpoint 仍然有效时才返回，所以这里非空就一定能 resume。
   */
  interrupts: AGUIInterrupt[];
  running: boolean;
}

/** POST /ai/threads/abort 的返回体 */
export interface AbortVo {
  aborted: boolean;
}
