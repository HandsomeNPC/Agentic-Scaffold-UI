<template>
  <div class="agent-panel">
    <agent-header
      :active-thread-id="activeThreadId"
      :disabled="busy"
      :threads="threads"
      @close="emit('close')"
      @create="newThread"
      @remove="removeThread"
      @select="selectThread"
    />

    <t-loading :loading="loadingHistory" class="agent-panel__body" size="small">
      <t-chat-list ref="listRef" :clear-history="false" class="agent-panel__chat">
        <t-chat-message
          v-for="message in messages"
          :key="message.id"
          :message="message"
          allow-content-segment-custom
          v-bind="messageProps[message.role as keyof TdChatMessageConfig]"
        >
          <!-- 工具调用内容 -->
          <template v-for="(item, index) in message.content" :key="`content-${index}`" #[`${item.type}-${index}`]>
            <div v-if="isToolCall(item)">
              <tool-call-renderer :tool-call="item.data" @respond="handleToolCallRespond" />
            </div>
          </template>
        </t-chat-message>
        <template #footer>
          <t-chat-sender
            v-model="inputValue"
            :loading="busy"
            :textarea-props="{ placeholder: '说点什么，比如：我想买两杯芋泥波波' }"
            @send="handleSend"
            @stop="handleStop"
          />
        </template>
      </t-chat-list>
    </t-loading>
  </div>
</template>
<script lang="ts" setup>
import type {
  AIMessageContent,
  ChatRequestParams,
  TdChatMessageConfig,
  ToolCall,
  ToolCallContent,
} from '@tdesign-vue-next/chat';
import {
  AGUIAdapter,
  ChatList as TChatList,
  ChatMessage as TChatMessage,
  ChatSender as TChatSender,
  isToolCallContent,
  ToolCallRenderer,
  useAgentToolcall,
  useChat,
} from '@tdesign-vue-next/chat';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, nextTick, onMounted, ref } from 'vue';

import { getToken } from '@/utils/auth';
import { isHandledRequestError } from '@/utils/request';

import { abortThread, CHAT_ENDPOINT, createThread, deleteThread, listThreads, renderThread } from '../api/thread';
import type { ThreadVo } from '../api/types';
import AgentHeader from './AgentHeader.vue';
import { toolcallActions } from './tools/register';

const emit = defineEmits<{ close: [] }>();

// 侧边栏只列 demo agent 的会话。与后端 agent.AgentNameDemo 对齐。
const AGENT_TYPE = 'demo';

const threads = ref<ThreadVo[]>([]);
const activeThreadId = ref('');
const inputValue = ref('');
const loadingHistory = ref(false);

useAgentToolcall(toolcallActions);

const { chatEngine, messages, status } = useChat({
  defaultMessages: [],
  chatServiceConfig: {
    endpoint: CHAT_ENDPOINT,
    protocol: 'agui',
    transport: 'sse',
    // 对话走裸 fetch，不经 axios 拦截器，鉴权头要自己带。
    onRequest: (params: ChatRequestParams) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        clientid: import.meta.env.VITE_APP_CLIENT_ID,
      },
      body: JSON.stringify({
        ...params,
        threadId: activeThreadId.value,
      }),
    }),

    // 断开 SSE 不会让后端的 run 停下，必须显式调 /abort。
    onAbort: async () => {
      if (!activeThreadId.value) return;
      try {
        await abortThread(activeThreadId.value);
      } catch (err) {
        console.warn('[chat] 通知后端终止失败:', err);
      }
    },

    onError: (err: Error | Response) => {
      MessagePlugin.error(err instanceof Error ? err.message : `对话请求失败(${err.status})`);
    },
  },
});

/** ChatList 通过 expose 暴露了 scrollToBottom，但类型声明里没有 */
const listRef = ref<{ scrollToBottom: (opts: { behavior: 'auto' | 'smooth' }) => void } | null>(null);

const busy = computed(() => status.value === 'pending' || status.value === 'streaming');

const messageProps: TdChatMessageConfig = {
  user: { variant: 'base', placement: 'right' },
  assistant: { variant: 'text', placement: 'left', chatContentProps: { markdown: {} } },
};

/** 用户消息的内容类型不在 AIMessageContent 里，放宽后交给引擎判断 */
function isToolCall(item: unknown): item is ToolCallContent {
  return isToolCallContent(item as AIMessageContent);
}

/** axios 拦截器已提示过的错误不再重复弹 */
function notifyError(err: unknown, fallback: string) {
  if (isHandledRequestError(err)) return;
  MessagePlugin.error(err instanceof Error && err.message ? err.message : fallback);
}

function scrollToBottom(behavior: 'auto' | 'smooth' = 'auto') {
  nextTick(() => listRef.value?.scrollToBottom({ behavior }));
}

/**
 * 工具卡片的 respond 回调。
 */
async function handleToolCallRespond(_toolcall: ToolCall, response: any) {
  try {
    await chatEngine.value?.resumeRun({ resume: response } as ChatRequestParams);
  } catch (err) {
    notifyError(err, '恢复执行失败');
  }
}

async function refreshThreads() {
  try {
    const res = await listThreads({ agentType: AGENT_TYPE });
    threads.value = res.data?.rows ?? [];
  } catch (err) {
    notifyError(err, '加载会话列表失败');
  }
}

/** 切换会话：用 /render 的历史替换消息列表。 */
async function selectThread(threadId: string) {
  if (!threadId) return;
  activeThreadId.value = threadId;

  loadingHistory.value = true;
  try {
    const res = await renderThread(threadId);
    // 切会话期间用户可能又点了别的会话，过期响应直接丢掉。
    if (activeThreadId.value !== threadId) return;
    chatEngine.value?.setMessages(AGUIAdapter.convertHistoryMessages((res.data?.messages ?? []) as never), 'replace');
    scrollToBottom();
  } catch (err) {
    if (activeThreadId.value === threadId) notifyError(err, '加载会话历史失败');
  } finally {
    if (activeThreadId.value === threadId) loadingHistory.value = false;
  }
}

async function newThread() {
  try {
    const res = await createThread({ agentType: AGENT_TYPE });
    const info = res.data!;
    threads.value = [info, ...threads.value];
    chatEngine.value?.clearMessages();
    await selectThread(info.threadId);
  } catch (err) {
    notifyError(err, '创建会话失败');
  }
}

async function removeThread(threadId: string) {
  try {
    await deleteThread(threadId);
    threads.value = threads.value.filter((t) => t.threadId !== threadId);
    if (activeThreadId.value !== threadId) return;

    activeThreadId.value = '';
    chatEngine.value?.clearMessages();
    const next = threads.value[0];
    if (next) await selectThread(next.threadId);
  } catch (err) {
    notifyError(err, '删除会话失败');
  }
}

async function handleSend(prompt: string) {
  const text = prompt.trim();
  if (!text) return;

  if (!activeThreadId.value) {
    await newThread();
    if (!activeThreadId.value) return;
  }

  inputValue.value = '';
  try {
    // sendUserMessage 要等整轮流式结束才 resolve，先发起再滚动
    const sending = chatEngine.value?.sendUserMessage({ prompt: text });
    scrollToBottom('smooth');
    await sending;
  } catch (err) {
    notifyError(err, '发送失败');
  }
}

function handleStop() {
  chatEngine.value?.abortChat();
}

onMounted(async () => {
  await refreshThreads();
  const first = threads.value[0];
  if (first) await selectThread(first.threadId);
  else await newThread();
});
</script>
<style lang="less" scoped>
.agent-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--td-bg-color-container);

  &__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;

    // TDesign Loading 的包裹层要撑满，否则 height:100% 落空会让 sender 溢出被裁。
    :deep(.t-loading),
    :deep(.t-loading__parent) {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
  }

  &__chat {
    flex: 1;
    min-height: 0;
    box-sizing: border-box;
    // 聊天框四周留白：底部留足空间，避免 sender 输入框下半部分被侧边栏 overflow:hidden 裁掉。
    padding: 12px 12px 16px;

    :deep(.t-chat__footer) {
      flex: 0 0 auto;
      margin-top: 12px;
    }
  }
}
</style>
