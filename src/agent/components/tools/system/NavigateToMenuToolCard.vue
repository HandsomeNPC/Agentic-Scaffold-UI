<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法跳转</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 匹配到多个菜单：不跳转，列出候选，点击即可前往 -->
    <template v-else-if="status === 'complete' && result?.candidates?.length">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #ed7b2f">
        匹配到多个菜单，请选择要前往的页面
      </div>
      <div v-for="m in result.candidates" :key="m.path" class="item">
        <t-link size="small" theme="primary" @click="open(m)">{{ m.breadcrumb }}</t-link>
      </div>
    </template>

    <!-- 已解析到目标菜单 -->
    <template v-else-if="status === 'complete' && result?.path">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ {{ heading }}</div>
      <div class="item">
        <t-link size="small" theme="primary" @click="open(result)">{{ result.breadcrumb }}</t-link>
        <span v-if="result.external" class="hint">外链，点击在新窗口打开</span>
      </div>
    </template>

    <!-- 解析中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在打开{{ args?.menu ? `「${args.menu}」` : '菜单' }}...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, inject, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { agentBusyKey } from '../context';

/**
 * NavigateToMenu 工具卡片（非 HITL，带副作用）。
 *
 * 注册为 `NavigateToMenu` 工具的渲染组件（见 register.ts）。后端在本人可见菜单里解析出目标，
 * 卡片拿到 navigate 为 true 的结果后自动 router.push。外链不自动打开：不是用户手势触发的
 * window.open 会被浏览器拦截，只给出链接由用户点击。
 *
 * 只对本轮实时返回的结果自动跳转（见 agentBusyKey）：切换会话、刷新恢复的历史卡片只展示、不跳转，
 * 否则翻一下历史页面就被带走。
 */

/** 菜单入口，对齐后端 menuItem。 */
interface MenuTarget {
  name?: string;
  breadcrumb?: string;
  path?: string;
  /** 菜单配置的路由参数，后端原样给的 JSON 字符串 */
  query?: string;
  external?: boolean;
}

/** 返回值，对齐后端 navigateToMenuResult。 */
interface NavigateToMenuResult extends MenuTarget {
  error?: string;
  navigate?: boolean;
  alreadyHere?: boolean;
  candidates?: MenuTarget[];
  message?: string;
}

const props = defineProps<{
  status?: string;
  result?: NavigateToMenuResult;
  args?: { menu?: string };
  respond?: (response: unknown[]) => void;
}>();

const router = useRouter();
const chatBusy = inject(agentBusyKey, ref(false));

const heading = computed(() => {
  if (props.result?.alreadyHere) return '已在该页面';
  if (props.result?.external) return '找到外链菜单';
  return '已跳转';
});

/** 解析菜单的 query_param，对齐侧边栏 MenuContent 的处理：解析失败按无参数处理。 */
function parseQuery(raw?: string): Record<string, any> | undefined {
  if (!raw) return undefined;
  try {
    const q = JSON.parse(raw);
    return q && typeof q === 'object' ? q : undefined;
  } catch {
    return undefined;
  }
}

function open(m: MenuTarget) {
  if (!m.path) return;
  if (m.external) {
    window.open(m.path, '_blank', 'noopener');
    return;
  }
  router
    .push({ path: m.path, query: parseQuery(m.query) })
    .catch((err) => console.warn('[NavigateToMenu] 跳转失败:', err));
}

// 一张卡片只自动跳一次：immediate 兜住 TOOL_CALL_START 与 RESULT 同批到达、卡片挂载即 complete 的情况。
let navigated = false;
watch(
  () => props.status === 'complete' && props.result?.navigate === true,
  (ready) => {
    if (!ready || navigated || !chatBusy.value || !props.result || props.result.external) return;
    navigated = true;
    open(props.result);
  },
  { immediate: true },
);
</script>
<style scoped>
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 24px;
}
.hint {
  color: #999;
}
</style>
