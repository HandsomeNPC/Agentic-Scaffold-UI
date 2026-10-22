<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法查询消息</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：按分类展示最近的消息 -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 我的消息（近 30 天）</div>
      <div v-if="!groups.length" style="font-size: 12px; color: #999">暂无消息</div>
      <div v-for="g in groups" :key="g.key" class="group">
        <div class="group-title">
          {{ g.title }}
          <span class="count">{{ countText(g) }}</span>
        </div>
        <div v-if="!g.items.length" style="font-size: 12px; color: #999">暂无</div>
        <div v-for="m in g.items" :key="m.messageId" class="item">
          <div class="item-text">{{ m.message }}</div>
          <div class="item-time">{{ formatTime(m.createTime) }}</div>
        </div>
      </div>
    </template>

    <!-- 查询中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在查询我的消息...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed } from 'vue';

/**
 * GetMyMessages 工具卡片（只读，非 HITL）。
 *
 * 注册为 `GetMyMessages` 工具的渲染组件（见 register.ts）。后端按 category 只回填被查询的分类，
 * 未查询的分类字段缺省，故这里只渲染存在的分组。
 */

/** 单条消息，对齐后端 messageItem。 */
interface MessageItem {
  messageId: number | string;
  message: string;
  content?: string;
  path?: string;
  createTime?: string;
}

/** 一个分类，对齐后端 messageGroup。total 是近 30 天条数，items 是截断后的最新若干条。 */
interface MessageGroup {
  total: number;
  items: MessageItem[];
}

/** 返回值，对齐后端 myMessagesResult。 */
interface MyMessagesResult {
  error?: string;
  system?: MessageGroup;
  notice?: MessageGroup;
  workflow?: MessageGroup;
}

const props = defineProps<{
  status?: string;
  result?: MyMessagesResult;
  args?: { category?: 'system' | 'notice' | 'workflow'; limit?: number };
  respond?: (response: unknown[]) => void;
}>();

const titles = { system: '系统消息', notice: '通知公告', workflow: '工作流消息' } as const;

const groups = computed(() =>
  (Object.keys(titles) as (keyof typeof titles)[]).flatMap((key) => {
    const g = props.result?.[key];
    return g ? [{ key, title: titles[key], total: g.total, items: g.items ?? [] }] : [];
  }),
);

function countText(g: { total: number; items: MessageItem[] }) {
  return g.total > g.items.length ? `共 ${g.total} 条，显示最新 ${g.items.length} 条` : `共 ${g.total} 条`;
}

/** createTime 是 RFC3339 字符串，本地化为可读形式；解析失败原样回显。 */
function formatTime(raw?: string) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>
<style scoped>
.group + .group {
  margin-top: 12px;
}
.group-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}
.count {
  margin-left: 4px;
  font-size: 12px;
  font-weight: normal;
  color: #999;
}
.item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  line-height: 20px;
}
.item-text {
  color: #333;
  word-break: break-all;
}
.item-time {
  flex: 0 0 auto;
  color: #999;
}
</style>
