<template>
  <div class="agent-panel">
    <div class="agent-panel__header">
      <t-select
        :disabled="busy"
        :options="threadOptions"
        :value="currentThreadId"
        class="agent-panel__thread"
        placeholder="选择会话"
        @change="onSwitch"
      >
        <template #option="{ option }">
          <div class="agent-panel__option">
            <span class="agent-panel__option-title">{{ option.label }}</span>
            <t-popconfirm content="删除该会话及全部消息？" @confirm="removeThread(option.value)">
              <delete-icon class="agent-panel__option-del" @click.stop />
            </t-popconfirm>
          </div>
        </template>
      </t-select>
      <t-tooltip content="新对话">
        <t-button :disabled="busy" shape="square" variant="text" @click="newThread">
          <template #icon><chat-bubble-add-icon /></template>
        </t-button>
      </t-tooltip>
      <t-tooltip content="关闭">
        <t-button shape="square" variant="text" @click="emit('close')">
          <template #icon><close-icon /></template>
        </t-button>
      </t-tooltip>
    </div>

    <t-loading :loading="loadingHistory" class="agent-panel__body" size="small">
      <t-chat-list ref="chatListRef" :clear-history="false" class="agent-panel__chat">
        <t-chat-message
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          allow-content-segment-custom
          v-bind="messageProps[msg.role as keyof TdChatMessageConfig]"
        >
          <!-- tool call 走具名插槽：`${内容type}-${下标}`，type 形如 toolcall-<工具名>-<调用ID> -->
          <template v-for="slot in toolSlotsOf(msg)" :key="slot.name" #[slot.name]>
            <tool-call-card
              :interrupt-message="interrupts[slot.toolCall.toolCallId]?.message"
              :respond="
                interrupts[slot.toolCall.toolCallId]
                  ? (ok: boolean, p?: unknown) => respond(slot.toolCall.toolCallId, ok, p)
                  : undefined
              "
              :tool-call="slot.toolCall"
            />
          </template>
        </t-chat-message>
        <template #footer>
          <t-chat-sender
            v-model="prompt"
            :loading="busy"
            :textarea-props="{ placeholder: '问我任何问题，或让我帮你操作系统，如「打开用户管理」' }"
            @send="onSend"
            @stop="stop"
          />
        </template>
      </t-chat-list>
    </t-loading>
  </div>
</template>
<script lang="ts" setup>
import type { ChatMessagesData, TdChatMessageConfig } from '@tdesign-vue-next/chat';
import {
  ChatList as TChatList,
  ChatMessage as TChatMessage,
  ChatSender as TChatSender,
  useChat,
} from '@tdesign-vue-next/chat';
import { ChatBubbleAddIcon, CloseIcon, DeleteIcon } from 'tdesign-icons-vue-next';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import type { ToolCallData } from '../tools';
import { useAgentChat } from '../useAgentChat';
import ToolCallCard from './ToolCallCard.vue';

const emit = defineEmits<{ close: [] }>();

const {
  threads,
  currentThreadId,
  loadingHistory,
  interrupts,
  chatEngine: sharedEngine,
  serviceConfig,
  switchThread,
  newThread,
  removeThread,
  ensureThread,
  respond,
  stop,
} = useAgentChat();

/** 引擎随面板挂载创建、卸载销毁；消息与状态由 useChat 订阅引擎同步成响应式数据 */
const { chatEngine, messages, status } = useChat({ defaultMessages: [], chatServiceConfig: serviceConfig });

/** ChatList 通过 expose 暴露了 scrollToBottom，但类型声明里没有 */
const chatListRef = ref<{ scrollToBottom: (opts: { behavior: 'auto' | 'smooth' }) => void } | null>(null);
const prompt = ref('');

const busy = computed(() => status.value === 'pending' || status.value === 'streaming');

const threadOptions = computed(() => threads.value.map((t) => ({ label: t.title || '未命名会话', value: t.threadId })));

const messageProps: TdChatMessageConfig = {
  user: { variant: 'base', placement: 'right' },
  assistant: { variant: 'text', placement: 'left', chatContentProps: { markdown: {} } },
};

/** 单条消息里的 tool call 插槽，名字与 t-chat-item 内部的 `<slot name="${type}-${index}">` 对应 */
function toolSlotsOf(msg: ChatMessagesData) {
  const out: { name: string; toolCall: ToolCallData }[] = [];
  if (msg.role !== 'assistant') return out;
  (msg.content || []).forEach((c: any, idx: number) => {
    if (typeof c?.type === 'string' && c.type.startsWith('toolcall-') && c.data?.toolCallId) {
      out.push({ name: `${c.type}-${idx}`, toolCall: c.data as ToolCallData });
    }
  });
  return out;
}

function scrollToBottom(behavior: 'auto' | 'smooth' = 'auto') {
  nextTick(() => chatListRef.value?.scrollToBottom({ behavior }));
}

async function onSend(value: string) {
  const text = value.trim();
  if (!text || busy.value || !chatEngine.value) return;
  prompt.value = '';
  // sendUserMessage 要等整轮流式结束才 resolve，先发起再滚动
  const sending = chatEngine.value.sendUserMessage({ prompt: text });
  scrollToBottom('smooth');
  await sending;
}

async function onSwitch(value: unknown) {
  await switchThread(String(value));
}

// 历史回填完成后滚到底
watch(loadingHistory, (loading) => {
  if (!loading) scrollToBottom();
});

/**
 * 引擎就绪后挂到全局会话状态上（切会话 / 审批 / 终止都经由它）。
 * 面板实例可能被重建（keep-alive 外的 v-if），会话已存在时把历史回填到新引擎；首次打开则进最近会话或新建。
 */
watch(chatEngine, async (engine) => {
  sharedEngine.value = engine;
  if (!engine) return;
  if (currentThreadId.value) await switchThread(currentThreadId.value);
  else await ensureThread();
});

onBeforeUnmount(() => {
  if (sharedEngine.value === chatEngine.value) sharedEngine.value = null;
});
</script>
<style lang="less" scoped>
.agent-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--td-bg-color-container);

  &__header {
    // 与系统顶部 Header 等高（--td-comp-size-xxxl，随 size 切换），图标随之放大。
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
    height: var(--td-comp-size-xxxl);
    padding: 0 12px 0 16px;
    border-bottom: 1px solid var(--td-component-stroke);

    // 按钮图标统一放大，对齐 Header 操作区观感
    :deep(.t-button .td-icon),
    :deep(.t-button svg) {
      font-size: 22px;
    }
  }

  &__thread {
    flex: 1;
    min-width: 0;
  }

  &__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 8px;
  }

  &__option-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__option-del {
    flex-shrink: 0;
    font-size: 18px;
    color: var(--td-text-color-placeholder);

    &:hover {
      color: var(--td-error-color);
    }
  }

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
