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

/** 随对话请求上报的前端界面状态，对齐后端 bo.ClientState */
export interface ClientState {
  /** 当前页面的前端路由，如 /system/user */
  currentPath: string;
  /** 当前页面标题（菜单名称），如 用户管理 */
  currentTitle?: string;
  /** 多标签栏里的页面，按标签顺序 */
  tabs?: ClientTab[];
  /** 界面设置，字段名对齐 src/config/style.ts */
  settings?: ClientSettings;
}

/** 多标签栏里的一个页面，对齐后端 bo.ClientTab */
export interface ClientTab {
  path: string;
  title?: string;
}

/** 页面配置抽屉里的设置项，对齐后端 bo.ClientSettings */
export interface ClientSettings {
  mode: string;
  brandTheme: string;
  sideMode: string;
  layout: string;
  /** 布局大小 small / medium / large，不在 settingStore 里，见 hooks/useLayoutSize */
  layoutSize: string;
  /** 浏览器当前是否全屏 */
  fullscreen: boolean;
  showHeader: boolean;
  showBreadcrumb: boolean;
  showFooter: boolean;
  isUseTabsRouter: boolean;
  menuAutoCollapsed: boolean;
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

/** POST /ai/threads/attachments 的返回体（对齐后端 vo.AttachmentUploadVo） */
export interface AttachmentUploadVo {
  /** 雪花 ID，按字符串处理。后端 transport=base64 时没有该字段 */
  attachmentId?: string;
  name: string;
  /** transport=url 时是有时效的预签名展示地址；transport=base64 时是 data URL */
  url: string;
  size: number;
  fileType: string;
  extension: string;
}

/** POST /ai/threads/abort 的返回体 */
export interface AbortVo {
  aborted: boolean;
}
