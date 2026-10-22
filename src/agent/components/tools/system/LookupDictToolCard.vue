<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错（无权限、类型不存在等）：后端 safeToolMiddleware 转成 result.error，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 字典查询失败</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：键值 → 标签对照表 -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">
        ✓ 字典 {{ result.dictType }}
      </div>
      <t-space direction="vertical" size="small" style="width: 100%">
        <div v-for="item in result.items ?? []" :key="item.value" class="field">
          <span class="label">{{ item.value }}</span>
          <span class="value">
            {{ item.label }}
            <t-tag v-if="item.isDefault" size="small" style="margin-left: 4px" theme="primary" variant="light">
              默认
            </t-tag>
          </span>
        </div>
      </t-space>
    </template>

    <!-- 查询中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在查询字典 {{ args?.dictType || '' }}...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
/**
 * LookupDict 工具卡片（只读，非 HITL）。
 *
 * 注册为 `LookupDict` 工具的渲染组件（见 register.ts）。传了 value 时后端只返回命中的那一项，
 * 故 items 可能只有一条。
 */

/** 单个字典选项，对齐后端 dictItem。 */
interface DictItem {
  value: string;
  label: string;
  isDefault?: boolean;
}

/** 返回值，对齐后端 lookupDictResult。 */
interface LookupDictResult {
  error?: string;
  dictType?: string;
  items?: DictItem[];
}

defineProps<{
  status?: string;
  result?: LookupDictResult;
  args?: { dictType?: string; value?: string };
  respond?: (response: unknown[]) => void;
}>();
</script>
<style scoped>
.field {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 20px;
}
.label {
  flex: 0 0 88px;
  color: #999;
  word-break: break-all;
}
.value {
  color: #333;
  word-break: break-all;
}
</style>
