<template>
  <component :is="def?.component || GenericToolCard" v-bind="cardProps" />
</template>
<script lang="ts" setup>
import { computed, watch } from 'vue';

import type { ToolCallData, ToolCardProps } from '../tools';
import { getAgentTool, runToolOnce } from '../tools';
import GenericToolCard from './cards/GenericToolCard.vue';

/** 把一条 toolcall-* 内容渲染成已登记的卡片，并在实时调用时执行前端工具。 */
const props = defineProps<{
  toolCall: ToolCallData;
  /** 该 tool call 是否正等待人工确认（来自 RUN_FINISHED.outcome.interrupts） */
  interruptMessage?: string;
  respond?: (approved: boolean, payload?: unknown) => void;
}>();

const def = computed(() => getAgentTool(props.toolCall.toolCallName));

function parse(raw?: string) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const args = computed(() => {
  const v = parse(props.toolCall.args);
  return v && typeof v === 'object' ? v : {};
});

const status = computed<ToolCardProps['status']>(() => {
  if (props.respond) return 'interrupted';
  if (props.toolCall.result) return 'complete';
  if (props.toolCall.eventType === 'TOOL_CALL_START' || props.toolCall.eventType === 'TOOL_CALL_ARGS') {
    return 'pending';
  }
  return 'executing';
});

const cardProps = computed<ToolCardProps>(() => ({
  toolCall: props.toolCall,
  args: args.value,
  result: parse(props.toolCall.result),
  status: status.value,
  interruptMessage: props.interruptMessage,
  respond: props.respond,
}));

// 参数流完（END 或已有结果）才执行：流式期间 args 不完整。
watch(
  () => [def.value, status.value] as const,
  ([d, s]) => {
    if (d?.execute && (s === 'executing' || s === 'complete')) {
      runToolOnce(d, props.toolCall.toolCallId, args.value);
    }
  },
  { immediate: true },
);
</script>
