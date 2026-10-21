<template>
  <div class="agent-approval">
    <div class="agent-approval__msg">{{ message || '该操作需要你确认后才会执行。' }}</div>
    <t-space size="small">
      <t-button :loading="submitting" size="small" theme="primary" @click="submit(true)">确认执行</t-button>
      <t-button :disabled="submitting" size="small" variant="outline" @click="submit(false)">取消</t-button>
    </t-space>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';

/** 通用审批面板：HITL 中断的「批准 / 拒绝」，审批类工具卡片复用它。 */
const props = defineProps<{
  message?: string;
  respond?: (approved: boolean, payload?: unknown) => void;
}>();

const submitting = ref(false);

function submit(approved: boolean) {
  if (!props.respond || submitting.value) return;
  submitting.value = true;
  props.respond(approved);
}
</script>
<style lang="less" scoped>
.agent-approval {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: var(--td-radius-default);
  background: var(--td-warning-color-1);

  &__msg {
    margin-bottom: 8px;
    color: var(--td-text-color-primary);
  }
}
</style>
