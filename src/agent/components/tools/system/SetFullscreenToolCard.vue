<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法切换全屏</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <template v-else-if="status === 'complete' && result">
      <div :style="{ color: isFullscreen === result.fullscreen ? '#00a870' : '#ed7b2f' }" class="heading">
        {{ heading }}
      </div>
      <div v-if="result.needClick && !isFullscreen" class="hint">浏览器要求由你亲手点击才能进入全屏</div>
      <div style="margin-top: 8px">
        <t-button v-if="isFullscreen" size="small" variant="outline" @click="exit">退出全屏</t-button>
        <t-button v-else size="small" theme="primary" @click="enter">进入全屏</t-button>
      </div>
    </template>

    <!-- 解析中 -->
    <template v-else>
      <div class="hint">正在{{ args?.fullscreen === false ? '退出' : '切换' }}全屏...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { agentBusyKey } from '../context';

/**
 * SetFullscreen 工具卡片（非 HITL，带副作用）。
 *
 * 注册为 `SetFullscreen` 工具的渲染组件（见 register.ts），与顶栏的全屏按钮（components/Screenfull）等价。
 * requestFullscreen 只能在用户手势里调，SSE 推来的结果里调会被浏览器拒绝，所以进入全屏只给按钮；
 * exitFullscreen 没有这个限制，本轮实时返回的退出指令直接执行（见 agentBusyKey），历史卡片不动。
 * 按钮跟随真实的全屏状态：用户按 Esc 退出后卡片同步变回「进入全屏」。
 */

/** 返回值，对齐后端 setFullscreenResult。 */
interface SetFullscreenResult {
  error?: string;
  fullscreen?: boolean;
  needClick?: boolean;
  alreadyDone?: boolean;
  message?: string;
}

const props = defineProps<{
  status?: string;
  result?: SetFullscreenResult;
  args?: { fullscreen?: boolean };
  respond?: (response: unknown[]) => void;
}>();

const chatBusy = inject(agentBusyKey, ref(false));

const isFullscreen = ref(!!document.fullscreenElement);
const sync = () => {
  isFullscreen.value = !!document.fullscreenElement;
};
onMounted(() => document.addEventListener('fullscreenchange', sync));
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', sync));

const heading = computed(() => {
  if (isFullscreen.value) return props.result?.fullscreen ? '✓ 已进入全屏' : '当前处于全屏';
  return props.result?.fullscreen ? '点击下方按钮进入全屏' : '✓ 已退出全屏';
});

function enter() {
  document.documentElement.requestFullscreen?.().catch((err) => console.warn('[SetFullscreen] 进入全屏失败:', err));
}

function exit() {
  if (!document.fullscreenElement) return;
  document.exitFullscreen?.().catch((err) => console.warn('[SetFullscreen] 退出全屏失败:', err));
}

// 一张卡片只自动执行一次：immediate 兜住 TOOL_CALL_START 与 RESULT 同批到达、卡片挂载即 complete 的情况。
let autoDone = false;
watch(
  () => props.status === 'complete' && props.result?.fullscreen === false,
  (ready) => {
    if (!ready || autoDone || !chatBusy.value) return;
    autoDone = true;
    exit();
  },
  { immediate: true },
);
</script>
<style scoped>
.heading {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}
.hint {
  font-size: 12px;
  color: #999;
}
</style>
