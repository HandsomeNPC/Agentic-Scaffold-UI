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
      <t-chatbot
        ref="chatbotRef"
        :chat-service-config="serviceConfig"
        :default-messages="[]"
        :message-props="messageProps"
        :sender-props="senderProps"
        class="agent-panel__chat"
        @message-change="onMessageChange"
        @chat-ready="onReady"
      >
        <!-- tool call 走具名插槽：`${消息ID}-${内容type}-${下标}`，type 形如 toolcall-<工具名>-<调用ID> -->
        <template v-for="slot in toolSlots" :key="slot.name" #[slot.name]>
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
      </t-chatbot>
    </t-loading>
  </div>
</template>
<script lang="ts" setup>
import type { ChatMessagesData, TdChatMessageConfig } from '@tdesign-vue-next/chat';
import { Chatbot as TChatbot } from '@tdesign-vue-next/chat';
import { ChatBubbleAddIcon, CloseIcon, DeleteIcon } from 'tdesign-icons-vue-next';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import type { ToolCallData } from '../tools';
import type { ChatbotInstance } from '../useAgentChat';
import { useAgentChat } from '../useAgentChat';
import ToolCallCard from './ToolCallCard.vue';

const emit = defineEmits<{ close: [] }>();

const {
  threads,
  currentThreadId,
  loadingHistory,
  interrupts,
  chatbot,
  serviceConfig,
  switchThread,
  newThread,
  removeThread,
  ensureThread,
  respond,
  stop,
} = useAgentChat();

const chatbotRef = ref<ChatbotInstance | null>(null);
const messages = ref<ChatMessagesData[]>([]);

const busy = computed(() => {
  const last = messages.value[messages.value.length - 1];
  return last?.status === 'pending' || last?.status === 'streaming';
});

const threadOptions = computed(() => threads.value.map((t) => ({ label: t.title || '未命名会话', value: t.threadId })));

const messageProps: TdChatMessageConfig = {
  user: { variant: 'base', placement: 'right' },
  assistant: { placement: 'left', chatContentProps: { markdown: {} } },
};

const senderProps = {
  placeholder: '问我任何问题，或让我帮你操作系统，如「打开用户管理」',
  onStop: () => stop(),
};

/** 从消息里收集 tool call 插槽。Chatbot 只渲染「它在 children 里看到的 slot」，所以要随消息动态生成。 */
const toolSlots = computed(() => {
  const out: { name: string; toolCall: ToolCallData }[] = [];
  for (const msg of messages.value) {
    if (msg.role !== 'assistant') continue;
    (msg.content || []).forEach((c: any, idx: number) => {
      if (typeof c?.type === 'string' && c.type.startsWith('toolcall-') && c.data?.toolCallId) {
        out.push({ name: `${msg.id}-${c.type}-${idx}`, toolCall: c.data as ToolCallData });
      }
    });
  }
  return out;
});

function onMessageChange(e: CustomEvent<ChatMessagesData[]>) {
  messages.value = e.detail;
}

/**
 * Chatbot（Omi Web Component）只在自身重渲染时重新收集 light DOM 里的 slot。
 * 回填历史（setMessages）时，消息先变、插槽元素在 Vue 下一帧才插入，它看不到新插槽 ——
 * 实测切换会话后最后一张卡片渲染为空。插槽集合变化后补一次 update。
 */
watch(
  () => toolSlots.value.map((s) => s.name).join('|'),
  async () => {
    await nextTick();
    (chatbotRef.value as unknown as { update?: () => void } | null)?.update?.();
  },
);

async function onReady() {
  chatbot.value = chatbotRef.value;
  await ensureThread();
}

async function onSwitch(value: unknown) {
  await switchThread(String(value));
}

onMounted(() => {
  if (chatbotRef.value) chatbot.value = chatbotRef.value;
});

// 面板实例可能被重建（keep-alive 外的 v-if），会话已存在时把历史回填到新实例
watch(chatbotRef, (inst) => {
  if (inst && currentThreadId.value && !messages.value.length) switchThread(currentThreadId.value);
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
  }
}
</style>
