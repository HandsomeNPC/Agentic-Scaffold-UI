<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法获取当前页面</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：当前页面 + 多标签栏 -->
    <template v-else-if="status === 'complete' && result?.current">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 当前页面</div>
      <div class="item">
        <span class="title">{{ result.current.title || '未命名页面' }}</span>
        <span class="hint">{{ result.current.path }}</span>
      </div>

      <div style="font-size: 14px; font-weight: 600; margin: 12px 0 8px">已打开的标签页</div>
      <div v-if="!result.tabsEnabled" style="font-size: 12px; color: #999">未开启多标签栏</div>
      <div v-else-if="!tabs.length" style="font-size: 12px; color: #999">没有打开的标签页</div>
      <div v-for="tab in tabs" :key="tab.path" class="item">
        <t-tag v-if="tab.active" size="small" theme="primary" variant="light">当前</t-tag>
        <t-link :disabled="tab.active" size="small" theme="primary" @click="open(tab)">
          {{ tab.title || tab.path }}
        </t-link>
        <span class="hint">{{ tab.path }}</span>
      </div>
    </template>

    <!-- 查询中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在获取当前页面...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

/**
 * GetOpenPages 工具卡片（只读，非 HITL）。
 *
 * 注册为 `GetOpenPages` 工具的渲染组件（见 register.ts）。后端原样转述本轮请求上报的
 * 当前页面与多标签栏（见 AgentPanel 的 currentClientState），点标签可切过去。
 * 展示的是提问那一刻的快照，之后用户切页、关标签不会回写到卡片上。
 */

/** 一个页面，对齐后端 openPage。 */
interface OpenPage {
  title: string;
  path: string;
  active?: boolean;
}

/** 返回值，对齐后端 openPagesResult。 */
interface OpenPagesResult {
  error?: string;
  current?: OpenPage;
  tabsEnabled?: boolean;
  tabs?: OpenPage[];
  message?: string;
}

const props = defineProps<{
  status?: string;
  result?: OpenPagesResult;
  args?: Record<string, never>;
  respond?: (response: unknown[]) => void;
}>();

const router = useRouter();

const tabs = computed(() => props.result?.tabs ?? []);

function open(tab: OpenPage) {
  router.push(tab.path).catch((err) => console.warn('[GetOpenPages] 跳转失败:', err));
}
</script>
<style scoped>
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 24px;
}
.title {
  color: #333;
}
.hint {
  color: #999;
}
</style>
