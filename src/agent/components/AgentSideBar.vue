<template>
  <template v-if="visible">
    <transition name="agent-sidebar">
      <!-- 常驻挂载：关闭只是 v-show 收起，对话与 SSE 连接照常进行，不走 v-if。 -->
      <aside v-show="open" class="agent-sidebar">
        <agent-panel @close="open = false" />
      </aside>
    </transition>
    <t-tooltip v-if="!open" content="智能助手" placement="left">
      <t-button class="agent-sidebar__fab" shape="circle" size="large" theme="primary" @click="open = true">
        <template #icon><chat-bubble-smile-icon /></template>
      </t-button>
    </t-tooltip>
  </template>
</template>
<script lang="ts" setup>
import { ChatBubbleSmileIcon } from 'tdesign-icons-vue-next';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { checkPermi } from '@/utils/permission';

import { setupAgentTools } from '../tools';
import AgentPanel from './AgentPanel.vue';

setupAgentTools();

/** 侧边栏宽度。打开时写到根元素的 --agent-sidebar-width，布局据此给页面让出右侧空间。 */
const SIDEBAR_WIDTH = 'min(520px, 100vw)';

/** 全局悬浮按钮 + 右侧对话侧边栏。无对话权限的用户不显示（后端 /chat 同样会拦）。 */
const visible = computed(() => checkPermi(['ai:thread:chat']));
// 默认打开：对话常驻挂载，关闭仅收起侧边栏，不销毁 Chatbot。
const open = ref(true);

watch(
  () => open.value && visible.value,
  (docked) => {
    document.documentElement.style.setProperty('--agent-sidebar-width', docked ? SIDEBAR_WIDTH : '0px');
  },
  { immediate: true },
);

onBeforeUnmount(() => document.documentElement.style.removeProperty('--agent-sidebar-width'));
</script>
<style lang="less" scoped>
.agent-sidebar__fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1400;
  box-shadow: var(--td-shadow-3);
}

// 低于 Dialog / Drawer（1500 起），弹窗仍能盖在侧边栏上
.agent-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1400;
  width: var(--agent-sidebar-width, min(520px, 100vw));
  overflow: hidden;
  border-left: 1px solid var(--td-component-stroke);
  box-shadow: var(--td-shadow-2);

  &-enter-active,
  &-leave-active {
    transition: transform 0.3s;
  }

  &-enter-from,
  &-leave-to {
    transform: translateX(100%);
  }
}
</style>
