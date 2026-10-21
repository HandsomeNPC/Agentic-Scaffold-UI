<template>
  <template v-if="visible">
    <div v-show="open" class="agent-float__window">
      <!-- 只在首次打开时挂载：Chatbot 一创建就会建会话 -->
      <agent-panel v-if="mounted" @close="open = false" />
    </div>
    <t-tooltip :content="open ? '收起智能助手' : '智能助手'" placement="left">
      <t-button class="agent-float__fab" shape="circle" size="large" theme="primary" @click="toggle">
        <template #icon>
          <close-icon v-if="open" />
          <chat-bubble-smile-icon v-else />
        </template>
      </t-button>
    </t-tooltip>
  </template>
</template>
<script lang="ts" setup>
import { ChatBubbleSmileIcon, CloseIcon } from 'tdesign-icons-vue-next';
import { computed, ref } from 'vue';

import { checkPermi } from '@/utils/permission';

import { setupAgentTools } from '../tools';
import AgentPanel from './AgentPanel.vue';

setupAgentTools();

/** 全局悬浮按钮 + 对话窗。无对话权限的用户不显示（后端 /chat 同样会拦）。 */
const visible = computed(() => checkPermi(['ai:thread:chat']));
const open = ref(false);
const mounted = ref(false);

function toggle() {
  open.value = !open.value;
  if (open.value) mounted.value = true;
}
</script>
<style lang="less" scoped>
.agent-float__fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2400;
  box-shadow: var(--td-shadow-3);
}

.agent-float__window {
  position: fixed;
  right: 24px;
  bottom: 80px;
  z-index: 2400;
  width: 420px;
  max-width: calc(100vw - 48px);
  height: 640px;
  max-height: calc(100vh - 120px);
  overflow: hidden;
  border-radius: var(--td-radius-large);
  box-shadow: var(--td-shadow-3);
}
</style>
