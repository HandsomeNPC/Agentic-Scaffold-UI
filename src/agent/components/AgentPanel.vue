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
            :attachments-props="senderAttachmentsProps"
            :textarea-props="{ placeholder: '说点什么，比如：我想买两杯芋泥波波' }"
            @send="handleSend"
            @stop="handleStop"
            @remove="handleAttachmentRemove"
            @file-select="handleFileSelect"
          >
            <template #suffix="{ renderPresets }">
              <component :is="() => renderPresets(senderActions)" />
            </template>
          </t-chat-sender>
        </template>
      </t-chat-list>
    </t-loading>
  </div>
</template>
<script lang="ts" setup>
import type {
  AIMessageContent,
  ChatRequestParams,
  TdAttachmentItem,
  TdChatMessageConfig,
  ToolCall,
  ToolCallContent,
  UploadActionConfig,
} from '@tdesign-vue-next/chat';
import {
  ChatList as TChatList,
  ChatMessage as TChatMessage,
  ChatSender as TChatSender,
  isToolCallContent,
  ToolCallRenderer,
  useAgentToolcall,
  useChat,
} from '@tdesign-vue-next/chat';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { getToken } from '@/utils/auth';
import { isHandledRequestError } from '@/utils/request';

import {
  abortThread,
  CHAT_ENDPOINT,
  createThread,
  deleteThread,
  listThreads,
  loadMessages,
  saveMessages,
  uploadAttachment,
} from '../api/thread';
import type { ThreadVo } from '../api/types';
import AgentHeader from './AgentHeader.vue';
import { toolcallActions } from './tools/register';

const emit = defineEmits<{ close: [] }>();

// 侧边栏只列 assistant agent 的会话。与后端 agent.AgentNameAssistant 对齐。
const AGENT_TYPE = 'assistant';

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

// ---------- 附件 ----------

/**
 * 允许上传的 MIME 类型白名单。
 * 后端 OSS handler 按 10 MB 上限，此处做前置过滤，减少无效请求。
 */
const ALLOWED_MIME = new Set([
  // 图片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // 文档
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB，与后端 maxUploadSize 对齐

/** 图片 picker 的 accept 列表，与 ALLOWED_MIME 里的图片子集对齐。 */
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
/** 文档 picker 的 accept 列表，与 ALLOWED_MIME 里的文档子集对齐。 */
const FILE_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
].join(',');

/**
 * 传给 renderPresets 的 actions 数组，让 sender 渲染图片 + 附件两个上传按钮。
 * 不提供 action 字段 → sender 回落到内置默认 action，继续 emit fileSelect。
 */
const senderActions: UploadActionConfig[] = [
  { name: 'uploadImage', uploadProps: { multiple: true, accept: IMAGE_ACCEPT } },
  { name: 'uploadAttachment', uploadProps: { multiple: true, accept: FILE_ACCEPT } },
];

/** 当前待发的附件列表，驱动 sender 的预览条。 */
const pendingAttachments = ref<TdAttachmentItem[]>([]);

/** sender 的 :attachments-props 绑定值，列表非空时显示预览条。 */
const senderAttachmentsProps = computed(() => ({
  items: pendingAttachments.value,
  overflow: 'scrollX' as const,
}));

/**
 * sender 的 @file-select 事件：校验类型/大小后上传到 OSS，
 * 上传成功则把 TdAttachmentItem 追加到预览列表。
 */
async function handleFileSelect({ files, name }: { files: File[]; name: string }) {
  for (const file of files) {
    if (!ALLOWED_MIME.has(file.type)) {
      MessagePlugin.warning(`「${file.name}」格式不支持，请上传图片、PDF、Word、Excel、PPT 或 TXT 文件`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      MessagePlugin.warning(`「${file.name}」超过 10 MB 限制`);
      continue;
    }

    // 先在预览条占位，status=loading
    const key = `${Date.now()}-${file.name}`;
    const placeholder: TdAttachmentItem = {
      key,
      name: file.name,
      size: file.size,
      type: name === 'uploadImage' ? 'image' : 'file',
      status: 'progress' as never,
      percent: 0,
      raw: file as never,
    };
    pendingAttachments.value = [...pendingAttachments.value, placeholder];

    try {
      const res = await uploadAttachment(file);
      const url = res.data?.url ?? '';
      // 后端只认 ossId（url/类型都不可信），按字符串存：雪花 ID 超出 JS 安全整数。
      const ossId = String(res.data?.ossId ?? '');
      pendingAttachments.value = pendingAttachments.value.map((item) =>
        item.key === key ? { ...item, url, metadata: { ossId }, status: 'success' as never, percent: 100 } : item,
      );
    } catch (err) {
      pendingAttachments.value = pendingAttachments.value.filter((item) => item.key !== key);
      notifyError(err, `「${file.name}」上传失败`);
    }
  }
}

/** sender 的 @remove 事件：从预览列表中移除对应附件。 */
function handleAttachmentRemove(e: CustomEvent<TdAttachmentItem>) {
  const removed = e?.detail;
  if (!removed?.key) return;
  pendingAttachments.value = pendingAttachments.value.filter((item) => item.key !== removed.key);
}

// ---------- / 附件 ----------

/**
 * 每轮流式结束（complete / stop / error）后存展示快照，刷新/切走都能恢复。
 *
 * 不能靠 await sendUserMessage：引擎里它没 await 内部的 sendRequest，建完消息就
 * resolve 了，那时存下来的只有用户消息和一条空的 pending 气泡。改为盯 status
 * 由忙转闲。runThreadId 记开跑时的会话：流式期间用户可能切走，只写自己那条。
 */
let runThreadId = '';
watch(busy, (isBusy, wasBusy) => {
  if (isBusy) {
    runThreadId = activeThreadId.value;
    return;
  }
  if (wasBusy && runThreadId && activeThreadId.value === runThreadId) {
    persistMessages(runThreadId);
  }
  runThreadId = '';
});

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

/** 工具卡片的 respond 回调。落盘由 busy 的 watch 统一处理。 */
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

/** 切换会话：用展示消息快照恢复气泡列表。 */
async function selectThread(threadId: string) {
  if (!threadId) return;
  // 切走前先把当前会话的展示消息落盘，避免最后一轮没存上。
  if (activeThreadId.value && activeThreadId.value !== threadId) {
    await persistMessages(activeThreadId.value);
  }

  activeThreadId.value = threadId;

  loadingHistory.value = true;
  try {
    const res = await loadMessages(threadId);
    // 切会话期间用户可能又点了别的会话，过期响应直接丢掉。
    if (activeThreadId.value !== threadId) return;
    // messages 即存即取已是 ChatMessagesData 形态，直接喂 setMessages，不再过
    // convertHistoryMessages（那是给 AG-UI 历史形态用的，会反向二次转换）。
    chatEngine.value?.setMessages((res.data?.messages ?? []) as never, 'replace');
    scrollToBottom();
  } catch (err) {
    if (activeThreadId.value === threadId) notifyError(err, '加载会话历史失败');
  } finally {
    if (activeThreadId.value === threadId) loadingHistory.value = false;
  }
}

/**
 * 把当前 messages 落盘为会话展示快照（前端展示用，不参与 Agent 上下文）。
 * 失败仅告警，不影响对话本身。
 */
async function persistMessages(threadId: string) {
  if (!threadId || !messages.value?.length) return;
  try {
    await saveMessages({ threadId, messages: messages.value });
  } catch (err) {
    if (!isHandledRequestError(err)) console.warn('[chat] 保存展示消息失败:', err);
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
  const hasAttachments = pendingAttachments.value.length > 0;
  if (!text && !hasAttachments) return;

  if (!activeThreadId.value) {
    await newThread();
    if (!activeThreadId.value) return;
  }

  // 只取上传成功的附件传给 engine，过滤掉仍在上传中或失败的占位项。
  const attachments = pendingAttachments.value
    .filter((item) => (item.status as string) === 'success' && item.metadata?.ossId)
    .map((item) => ({
      // fileType 只影响气泡里的图标/预览；后端按 OSS 记录的文件名自行判定类型。
      fileType: (item.type === 'image' ? 'image' : 'txt') as 'image' | 'txt',
      name: item.name ?? '',
      url: item.url ?? '',
      size: item.size ?? 0,
      extension: item.name?.split('.').pop() ?? '',
      metadata: item.metadata,
    }));

  inputValue.value = '';
  pendingAttachments.value = [];

  try {
    // 建完消息就 resolve，不等流式结束；落盘由 busy 的 watch 负责。
    await chatEngine.value?.sendUserMessage({ prompt: text, attachments });
    scrollToBottom('smooth');
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
