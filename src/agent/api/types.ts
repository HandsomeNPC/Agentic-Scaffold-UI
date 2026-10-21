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

/** POST /ai/threads/messages/save 的请求体 —— 前端 useChat messages 原样回传。 */
export interface SaveMessagesRequest {
  threadId: string;
  messages: unknown[];
}

/** POST /ai/threads/messages/load 的返回体 —— 展示消息原样存取，不参与 Agent 上下文。 */
export interface DisplayMessagesVo {
  threadId: string;
  messages: unknown[];
}

/** POST /ai/threads/abort 的返回体 */
export interface AbortVo {
  aborted: boolean;
}
