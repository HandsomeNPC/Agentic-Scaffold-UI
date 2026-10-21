import type { ChatServiceConfig, IChatEngine, SSEChunkData } from '@tdesign-vue-next/chat';
import { AGUIAdapter } from '@tdesign-vue-next/chat';
import { MessagePlugin } from 'tdesign-vue-next';
import { ref, shallowRef } from 'vue';

import { getToken } from '@/utils/auth';

import { abortThread, createThread, deleteThread, listThreads, renderThread } from './api/thread';
import type { AgentInterrupt, ResumeEntry, ThreadVo } from './api/types';
import { snapshotPageContext } from './page-context';
import { markLiveToolCall } from './tools';

/** 悬浮框会话固定走 Supervisor（后端 agent.AgentNameSupervisor） */
export const AGENT_TYPE = 'supervisor';

const baseApi = import.meta.env.VITE_APP_BASE_API;

/**
 * 悬浮对话框的会话状态与通信。全局单例：悬浮框关掉再打开，状态不丢。
 *
 * 通信全部走 /ai/threads/*：
 *  - 对话是 SSE（ChatEngine 内部的 fetch，protocol=agui），请求体由 onRequest 组装成后端
 *    bo.ChatRequest 的形状 {threadId, prompt, messageID, state, resume}；
 *  - 其余是普通 axios 请求，复用全局的 token / 401 处理。
 */
function createAgentChat() {
  const threads = ref<ThreadVo[]>([]);
  const currentThreadId = ref<string>('');
  const loadingHistory = ref(false);
  /** 当前待确认的中断，按 toolCallId 索引，卡片据此渲染审批面板 */
  const interrupts = ref<Record<string, AgentInterrupt>>({});
  /** 对话引擎，由 AgentPanel 里的 useChat 创建后挂上来；面板卸载时置空 */
  const chatEngine = shallowRef<IChatEngine | null>(null);

  /**
   * 下一次请求要带的 resume。sendAIMessage 的 params 不会进 onRequest 以外的地方，
   * 用一个一次性槽位比改写引擎状态简单可靠。
   */
  let pendingResume: ResumeEntry[] | null = null;

  async function refreshThreads() {
    const res = await listThreads();
    threads.value = res.data?.rows ?? [];
  }

  /** 切换会话：拉历史 → 转成 TDesign 消息 → 整体替换 */
  async function switchThread(threadId: string) {
    if (!threadId) return;
    // 正在输出时切走：只断本地流，不 abort 后端（loop 跨请求常驻，回来还能看到落库结果）
    await chatEngine.value?.abortChat().catch(() => {});
    currentThreadId.value = threadId;
    interrupts.value = {};
    loadingHistory.value = true;
    try {
      const res = await renderThread(threadId);
      const data = res.data;
      const messages = AGUIAdapter.convertHistoryMessages(data?.messages ?? []);
      chatEngine.value?.setMessages(messages, 'replace');
      setInterrupts(data?.interrupts ?? []);
    } finally {
      loadingHistory.value = false;
    }
  }

  async function newThread() {
    const res = await createThread({ title: '新对话', agentType: AGENT_TYPE });
    const t = res.data!;
    threads.value = [t, ...threads.value];
    currentThreadId.value = t.threadId;
    interrupts.value = {};
    chatEngine.value?.setMessages([], 'replace');
    return t;
  }

  async function removeThread(threadId: string) {
    await deleteThread(threadId);
    threads.value = threads.value.filter((t) => t.threadId !== threadId);
    if (threadId === currentThreadId.value) {
      currentThreadId.value = '';
      interrupts.value = {};
      chatEngine.value?.setMessages([], 'replace');
    }
  }

  /** 首次打开：有会话就进最近一个，没有就新建 */
  async function ensureThread() {
    if (currentThreadId.value) return;
    await refreshThreads();
    if (threads.value.length) {
      await switchThread(threads.value[0].threadId);
    } else {
      await newThread();
    }
  }

  function setInterrupts(list: AgentInterrupt[]) {
    const map: Record<string, AgentInterrupt> = {};
    for (const it of list) {
      if (it.toolCallId) map[it.toolCallId] = it;
    }
    interrupts.value = map;
  }

  /**
   * 提交审批，触发 resume。
   *
   * 后端约定：interruptId 不由前端传，按快照序号配对；所以 resume 数组按中断的原始顺序排，
   * 本次只表态当前这一个，其余同批中断沿用「批准」默认（后端对缺省项按 resolved 处理）。
   * 不发新的用户消息：sendAIMessage 只开一个新的 AI 气泡并发请求。
   */
  async function respond(toolCallId: string, approved: boolean, payload?: unknown) {
    const list = Object.values(interrupts.value);
    pendingResume = list.map((it) =>
      it.toolCallId === toolCallId ? { status: approved ? 'resolved' : 'cancelled', payload } : { status: 'resolved' },
    );
    interrupts.value = {};
    await chatEngine.value?.sendAIMessage({ params: {}, sendRequest: true });
  }

  /** 终止：先断本地流，再让后端停 loop（只断流的话后端 run 仍在跑） */
  async function stop() {
    await chatEngine.value?.abortChat().catch(() => {});
    if (currentThreadId.value) await abortThread(currentThreadId.value).catch(() => {});
  }

  const serviceConfig: ChatServiceConfig = {
    endpoint: `${baseApi}/ai/threads/chat`,
    protocol: 'agui',
    stream: true,
    onRequest: (params) => {
      const resume = pendingResume;
      pendingResume = null;
      const body: Record<string, unknown> = {
        threadId: currentThreadId.value,
        messageID: params.messageID,
        state: snapshotPageContext(),
      };
      if (resume) body.resume = resume;
      else body.prompt = params.prompt;
      return {
        ...params,
        headers: {
          Authorization: `Bearer ${getToken()}`,
          clientid: import.meta.env.VITE_APP_CLIENT_ID,
        },
        body: JSON.stringify(body),
      };
    },
    onMessage: (chunk: SSEChunkData) => {
      const ev = parseEvent(chunk);
      if (!ev) return null;
      // 实时流里出现的 tool call 才允许执行前端工具（见 tools/registry.ts）
      if (ev.type === 'TOOL_CALL_START' && ev.toolCallId) markLiveToolCall(ev.toolCallId);
      if (ev.type === 'RUN_FINISHED' && ev.outcome?.type === 'interrupt') {
        setInterrupts(ev.outcome.interrupts ?? []);
      }
      // 返回 null：保留 AGUIAdapter 的解析结果
      return null;
    },
    onComplete: () => {
      // 新会话的第一轮结束后后端会改标题/更新时间，顺手刷新列表
      refreshThreads().catch(() => {});
    },
    onError: (err) => {
      // 后端在写 SSE 头之前的校验失败（无权限、会话不存在）回的是 application/json，
      // TDesign 只当作连接错误；这里给个可读提示。
      console.error('[agent] chat error', err);
      MessagePlugin.error('对话请求失败，请稍后重试');
    },
  };

  return {
    threads,
    currentThreadId,
    loadingHistory,
    interrupts,
    chatEngine,
    serviceConfig,
    refreshThreads,
    switchThread,
    newThread,
    removeThread,
    ensureThread,
    respond,
    stop,
  };
}

function parseEvent(chunk: SSEChunkData): any {
  const d = chunk?.data as unknown;
  if (!d) return null;
  if (typeof d === 'string') {
    try {
      return JSON.parse(d);
    } catch {
      return null;
    }
  }
  return d;
}

let instance: ReturnType<typeof createAgentChat> | null = null;

export function useAgentChat() {
  if (!instance) instance = createAgentChat();
  return instance;
}
