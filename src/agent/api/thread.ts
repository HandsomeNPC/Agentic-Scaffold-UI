import type { PageResult } from '@/api/types';
import type { AxiosPromise } from '@/utils/api-types';
import request from '@/utils/request';

import type { AbortVo, RenderVo, ThreadVo } from './types';

// threadId 一律按字符串传：雪花 19 位超出 JS 安全整数，后端 jsonx 两种形态都认。

/** 会话列表（仅当前用户），按更新时间倒序 */
export const listThreads = (pageNum = 1, pageSize = 50): AxiosPromise<PageResult<ThreadVo>> =>
  request({ url: '/ai/threads', method: 'get', params: { pageNum, pageSize } });

/** 新建会话 */
export const createThread = (data: { title?: string; agentType?: string }): AxiosPromise<ThreadVo> =>
  request({ url: '/ai/threads', method: 'post', data });

/** 删除会话 */
export const deleteThread = (threadId: string): AxiosPromise<void> =>
  request({ url: '/ai/threads/delete', method: 'post', data: { threadId } });

/** 拉取会话历史，用于切换/刷新后回填 */
export const renderThread = (threadId: string): AxiosPromise<RenderVo> =>
  request({ url: '/ai/threads/render', method: 'post', data: { threadId } });

/**
 * 终止会话当前运行。
 * repeatSubmit: false —— 连点「终止」是合法诉求，后端 abort 本身幂等。
 */
export const abortThread = (threadId: string): AxiosPromise<AbortVo> =>
  request({ url: '/ai/threads/abort', method: 'post', data: { threadId }, headers: { repeatSubmit: false } });
