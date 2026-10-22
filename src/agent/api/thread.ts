import type { PageResult } from '@/api/types';
import type { AxiosPromise } from '@/utils/api-types';
import request from '@/utils/request';

import type { AbortVo, DisplayMessagesVo, SaveMessagesRequest, ThreadQuery, ThreadVo } from './types';

// threadId 一律按字符串传：雪花 19 位超出 JS 安全整数，后端 jsonx 两种形态都认。

/** 会话列表（仅当前用户），按创建时间倒序 */
export const listThreads = (query: ThreadQuery = {}): AxiosPromise<PageResult<ThreadVo>> =>
  request({ url: '/ai/threads', method: 'get', params: { pageNum: 1, pageSize: 50, ...query } });

/** 创建会话。两个入参都可省略：agentType 留空由后端使用默认 Agent。 */
export const createThread = (data?: { title?: string; agentType?: string }): AxiosPromise<ThreadVo> =>
  request({ url: '/ai/threads', method: 'post', data: data ?? {} });

/** 删除会话 */
export const deleteThread = (threadId: string): AxiosPromise<void> =>
  request({ url: '/ai/threads/delete', method: 'post', data: { threadId } });

/** 存展示消息快照（前端展示用，不参与 Agent 上下文）。整份覆盖写。 */
export const saveMessages = (data: SaveMessagesRequest): AxiosPromise<void> =>
  request({ url: '/ai/threads/messages/save', method: 'post', data });

/** 读展示消息快照，供刷新后恢复聊天气泡列表。无快照时后端回空数组。 */
export const loadMessages = (threadId: string): AxiosPromise<DisplayMessagesVo> =>
  request({ url: '/ai/threads/messages/load', method: 'post', data: { threadId } });

/**
 * 终止会话当前运行。
 * repeatSubmit: false —— 连点「终止」是合法诉求，后端 abort 本身幂等。
 */
export const abortThread = (threadId: string): AxiosPromise<AbortVo> =>
  request({ url: '/ai/threads/abort', method: 'post', data: { threadId }, headers: { repeatSubmit: false } });

/** 对话流地址。交给 ChatEngine 作为 SSE endpoint。 */
export const CHAT_ENDPOINT = `${import.meta.env.VITE_APP_BASE_API}/ai/threads/chat`;

/**
 * 上传附件到 OSS。
 * 走 multipart/form-data（axios 自动设置 Content-Type），不走 apiencrypt。
 */
export const uploadAttachment = (file: File): AxiosPromise<{ url: string; fileName: string; ossId: string }> => {
  const form = new FormData();
  form.append('file', file);
  return request({ url: '/resource/oss/upload', method: 'post', data: form });
};
