<template>
  <div class="agent-header">
    <t-select
      :disabled="disabled"
      :options="threadOptions"
      :value="activeThreadId"
      class="agent-header__thread"
      placeholder="选择会话"
      @change="(v: unknown) => emit('select', String(v))"
    >
      <template #option="{ option }">
        <div class="agent-header__option">
          <span class="agent-header__option-title">{{ option.label }}</span>
          <!-- 阻止冒泡：删除不该顺带把这条会话选中 -->
          <t-popconfirm content="删除该会话及全部消息？" @confirm="emit('remove', option.value)">
            <delete-icon class="agent-header__option-del" @click.stop />
          </t-popconfirm>
        </div>
      </template>
    </t-select>
    <t-tooltip content="新对话">
      <t-button :disabled="disabled" shape="square" variant="text" @click="emit('create')">
        <template #icon><chat-bubble-add-icon /></template>
      </t-button>
    </t-tooltip>
    <t-popconfirm content="删除当前会话及全部消息？" @confirm="emit('remove', activeThreadId)">
      <t-tooltip content="删除对话">
        <t-button :disabled="disabled || !activeThreadId" shape="square" variant="text">
          <template #icon><delete-icon /></template>
        </t-button>
      </t-tooltip>
    </t-popconfirm>
    <t-tooltip content="关闭">
      <t-button shape="square" variant="text" @click="emit('close')">
        <template #icon><close-icon /></template>
      </t-button>
    </t-tooltip>
  </div>
</template>
<script lang="ts" setup>
/** 对话面板顶部工具栏：会话切换、新建、删除当前会话、关闭。 */
import { ChatBubbleAddIcon, CloseIcon, DeleteIcon } from 'tdesign-icons-vue-next';
import { computed } from 'vue';

import type { ThreadVo } from '../api/types';

const props = defineProps<{
  threads: ThreadVo[];
  activeThreadId: string;
  /** 对话输出中禁止切换 / 新建会话 */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', threadId: string): void;
  (e: 'remove', threadId: string): void;
  (e: 'create'): void;
  (e: 'close'): void;
}>();

const threadOptions = computed(() => props.threads.map((t) => ({ label: t.title || '新会话', value: t.threadId })));
</script>
<style lang="less" scoped>
.agent-header {
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
}
</style>
