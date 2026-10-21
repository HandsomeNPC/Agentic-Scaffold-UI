<template>
  <div class="agent-tool-card">
    <div class="agent-tool-card__head">
      <t-loading v-if="status !== 'complete'" size="small" />
      <check-circle-filled-icon v-else class="agent-tool-card__ok" />
      <span>{{ status === 'complete' ? '已由' : '正在交给' }}「{{ label }}」处理</span>
      <t-link v-if="status === 'complete' && detail" hover="color" theme="primary" @click="expanded = !expanded">
        {{ expanded ? '收起' : '查看详情' }}
      </t-link>
    </div>
    <div v-if="args.request" class="agent-tool-card__body agent-sub__req">任务：{{ args.request }}</div>
    <!-- 子智能体的完整回复：它也会被 Supervisor 转述一遍，默认折叠以免看到两份 -->
    <div v-if="expanded && detail" class="agent-tool-card__body">
      <chat-markdown :content="detail" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ChatMarkdown } from '@tdesign-vue-next/chat';
import { CheckCircleFilledIcon } from 'tdesign-icons-vue-next';
import { computed, ref } from 'vue';

import type { ToolCardProps } from '../../tools';

const props = defineProps<ToolCardProps<{ request?: string }>>();

const LABELS: Record<string, string> = {
  SystemAgent: '系统管理助手',
};

const label = computed(() => LABELS[props.toolCall.toolCallName] || props.toolCall.toolCallName);
const detail = computed(() => (typeof props.result === 'string' ? props.result : props.toolCall.result || ''));
const expanded = ref(false);
</script>
<style lang="less" scoped>
@import './card.less';

.agent-sub__req {
  color: var(--td-text-color-placeholder);
}
</style>
