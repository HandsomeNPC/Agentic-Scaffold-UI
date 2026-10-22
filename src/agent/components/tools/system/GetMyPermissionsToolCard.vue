<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法查询权限</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：展示角色、权限码，以及单项判定结果 -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 我的权限</div>
      <t-space direction="vertical" size="small" style="width: 100%">
        <div v-if="result.checked" class="field">
          <span class="label">权限判定</span>
          <span class="value">
            <t-tag :theme="result.granted ? 'success' : 'danger'" size="small" variant="light">
              {{ result.granted ? '拥有' : '未拥有' }}
            </t-tag>
            <span style="margin-left: 6px">{{ result.checked }}</span>
          </span>
        </div>
        <div class="field">
          <span class="label">角色</span>
          <span class="value">
            <t-tag v-if="result.superAdmin" size="small" theme="warning" variant="light">超级管理员</t-tag>
            <template v-else>{{ result.roles?.length ? result.roles.join('、') : '-' }}</template>
          </span>
        </div>
        <div class="field">
          <span class="label">权限码</span>
          <span class="value">
            <template v-if="result.superAdmin">全部权限</template>
            <template v-else-if="result.permissions?.length">
              共 {{ result.permissions.length }} 项
              <t-link
                v-if="result.permissions.length > previewSize"
                size="small"
                theme="primary"
                @click="expanded = !expanded"
              >
                {{ expanded ? '收起' : '展开全部' }}
              </t-link>
            </template>
            <template v-else>-</template>
          </span>
        </div>
        <div v-if="!result.superAdmin && visiblePerms.length" class="perms">
          <t-tag v-for="p in visiblePerms" :key="p" size="small" variant="outline">{{ p }}</t-tag>
        </div>
      </t-space>
    </template>

    <!-- 查询中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">
        {{ args?.permission ? `正在判断是否拥有 ${args.permission}...` : '正在查询我的权限...' }}
      </div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';

/**
 * GetMyPermissions 工具卡片（只读，非 HITL）。
 *
 * 注册为 `GetMyPermissions` 工具的渲染组件（见 register.ts）。传了 permission 时后端额外给出
 * checked / granted —— 判定按 sa-token 的通配口径在后端完成，前端只展示，不自行比对。
 */

/** 返回值，对齐后端 myPermissionsResult。 */
interface MyPermissionsResult {
  error?: string;
  superAdmin: boolean;
  roles?: string[];
  permissions?: string[];
  checked?: string;
  granted?: boolean;
}

const props = defineProps<{
  status?: string;
  result?: MyPermissionsResult;
  args?: { permission?: string };
  respond?: (response: unknown[]) => void;
}>();

/** 权限码可能上百项，默认只展示前若干项。 */
const previewSize = 12;
const expanded = ref(false);

const visiblePerms = computed(() => {
  const list = props.result?.permissions ?? [];
  return expanded.value ? list : list.slice(0, previewSize);
});
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
}
.value {
  color: #333;
  word-break: break-all;
}
.perms {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
