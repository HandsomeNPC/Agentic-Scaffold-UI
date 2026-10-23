<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法查询菜单</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：扁平菜单列表，菜单项可直接跳转 -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ {{ title }}</div>
      <div v-if="!menus.length" style="font-size: 12px; color: #999">没有匹配的菜单</div>
      <div v-for="m in menus" :key="m.breadcrumb" class="item">
        <t-tag :theme="m.type === '目录' ? 'default' : 'primary'" size="small" variant="light">{{ m.type }}</t-tag>
        <t-link v-if="m.type === '菜单'" size="small" theme="primary" @click="open(m)">{{ m.breadcrumb }}</t-link>
        <span v-else class="crumb">{{ m.breadcrumb }}</span>
      </div>
    </template>

    <!-- 查询中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在查询我的菜单...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

/**
 * GetMyMenus 工具卡片（只读，非 HITL）。
 *
 * 注册为 `GetMyMenus` 工具的渲染组件（见 register.ts）。后端已把 getRouters 同源的菜单树
 * 裁成「面包屑 + 完整路由」的扁平列表，这里点菜单项直接跳转，外链新窗口打开。
 */

/** 单个菜单入口，对齐后端 menuItem。 */
interface MenuItem {
  name: string;
  breadcrumb: string;
  path: string;
  type: '目录' | '菜单';
  external?: boolean;
  /** 菜单配置的路由参数，后端原样给的 JSON 字符串 */
  query?: string;
}

/** 返回值，对齐后端 myMenusResult。 */
interface MyMenusResult {
  error?: string;
  menus?: MenuItem[];
}

const props = defineProps<{
  status?: string;
  result?: MyMenusResult;
  args?: { keyword?: string };
  respond?: (response: unknown[]) => void;
}>();

const router = useRouter();

const menus = computed(() => props.result?.menus ?? []);
const title = computed(() => (props.args?.keyword ? `包含「${props.args.keyword}」的菜单` : '我的菜单'));

function open(m: MenuItem) {
  if (m.external) {
    window.open(m.path, '_blank', 'noopener');
    return;
  }
  let query: Record<string, any> | undefined;
  try {
    query = m.query ? JSON.parse(m.query) : undefined;
  } catch {
    query = undefined;
  }
  router.push({ path: m.path, query });
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
.crumb {
  color: #333;
}
</style>
