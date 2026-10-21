<template>
  <div class="agent-tool-card">
    <div class="agent-tool-card__head">
      <t-loading v-if="status === 'pending' || status === 'executing'" size="small" />
      <check-circle-filled-icon v-else-if="status === 'complete'" class="agent-tool-card__ok" />
      <error-circle-filled-icon v-else class="agent-tool-card__warn" />
      <span>{{ toolCall.toolCallName }}</span>
    </div>
    <approval-panel v-if="status === 'interrupted'" :message="interruptMessage" :respond="respond" />
  </div>
</template>
<script lang="ts" setup>
import { CheckCircleFilledIcon, ErrorCircleFilledIcon } from 'tdesign-icons-vue-next';

import type { ToolCardProps } from '../../tools';
import ApprovalPanel from './ApprovalPanel.vue';

defineProps<ToolCardProps>();
</script>
<style lang="less" scoped>
@import './card.less';
</style>
