<template>
  <div class="agent-tool-card">
    <div class="agent-tool-card__head">
      <t-loading v-if="status === 'pending'" size="small" />
      <jump-icon v-else />
      <span>打开页面</span>
      <t-link v-if="args.path" hover="color" theme="primary" @click="open">{{ args.path }}</t-link>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { JumpIcon } from 'tdesign-icons-vue-next';

import router from '@/router';

import type { ToolCardProps } from '../../tools';
import type { NavigateArgs } from '../../tools/navigate';

/** 自动跳转由 ToolCallCard 统一触发；这里只提供「再次打开」的链接（历史回放时也可点）。 */
const props = defineProps<ToolCardProps<NavigateArgs>>();

function open() {
  router.push({ path: props.args.path, query: props.args.query }).catch(() => {});
}
</script>
<style lang="less" scoped>
@import './card.less';
</style>
