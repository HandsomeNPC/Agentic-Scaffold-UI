<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 SafeTool 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="done?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 分配角色失败</div>
      <div style="font-size: 12px; color: #666">{{ done.error }}</div>
    </template>

    <template v-else-if="done?.cancelled">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #888">已取消分配</div>
      <div style="font-size: 12px; color: #666">{{ done.message || '角色未变更。' }}</div>
    </template>

    <!-- 已完成：后端回传实际生效的新增 / 移除 / 保留 -->
    <template v-else-if="done">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 角色已更新</div>
      <div class="field">
        <span class="label">用户</span>
        <span class="value">{{ done.nickName }}（{{ done.userName }}）</span>
      </div>
      <div v-if="done.added?.length" class="field">
        <span class="label">新增</span>
        <span class="tags">
          <t-tag v-for="r in done.added" :key="r" size="small" theme="success" variant="light">+ {{ r }}</t-tag>
        </span>
      </div>
      <div v-if="done.removed?.length" class="field">
        <span class="label">移除</span>
        <span class="tags">
          <t-tag v-for="r in done.removed" :key="r" size="small" theme="danger" variant="light">- {{ r }}</t-tag>
        </span>
      </div>
      <div v-if="done.kept?.length" class="field">
        <span class="label">保留</span>
        <span class="tags">
          <t-tag v-for="r in done.kept" :key="r" size="small" variant="light">{{ r }}</t-tag>
        </span>
      </div>
      <div style="font-size: 12px; color: #999; margin-top: 4px">{{ done.message }}</div>
    </template>

    <template v-else-if="submitted">
      <div style="font-size: 12px; color: #999">
        {{ submitted === 'cancelled' ? '已取消，等待助手回复...' : '已确认，正在保存...' }}
      </div>
    </template>

    <!-- 待确认：列清新增 / 移除 / 保留的角色 -->
    <template v-else>
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px">请确认分配角色</div>
      <t-loading :loading="loading" size="small">
        <div class="field">
          <span class="label">用户</span>
          <span class="value">
            <template v-if="target">{{ target.nickName }}（{{ target.userName }}）</template>
            <template v-else>{{ args?.userName || '-' }}</template>
          </span>
        </div>
        <template v-if="diff">
          <div v-if="diff.added.length" class="field">
            <span class="label">新增</span>
            <span class="tags">
              <t-tag v-for="r in diff.added" :key="r.roleKey" size="small" theme="success" variant="light">
                + {{ r.roleName }}
              </t-tag>
            </span>
          </div>
          <div v-if="diff.removed.length" class="field">
            <span class="label">移除</span>
            <span class="tags">
              <t-tag v-for="r in diff.removed" :key="r.roleKey" size="small" theme="danger" variant="light">
                - {{ r.roleName }}
              </t-tag>
            </span>
          </div>
          <div v-if="diff.kept.length" class="field">
            <span class="label">保留</span>
            <span class="tags">
              <t-tag v-for="r in diff.kept" :key="r.roleKey" size="small" variant="light">{{ r.roleName }}</t-tag>
            </span>
          </div>
          <div v-if="diff.invalid.length" style="font-size: 12px; color: #e34d59; margin-top: 4px">
            角色 {{ diff.invalid.join('、') }} 不存在或已停用，确认后将执行失败。
          </div>
          <div v-if="!diff.added.length && !diff.removed.length" style="font-size: 12px; color: #999; margin-top: 4px">
            角色没有变化。
          </div>
        </template>
        <!-- 查不到现状（无 system:user:list / system:user:query 或用户不存在）时只列目标角色 -->
        <div v-else class="field">
          <span class="label">分配后</span>
          <span class="tags">
            <t-tag v-for="k in roleKeys" :key="k" size="small" variant="light">{{ k }}</t-tag>
          </span>
        </div>
        <div v-if="lookupHint" style="font-size: 12px; color: #e34d59; margin-top: 4px">{{ lookupHint }}</div>
        <div style="font-size: 12px; color: #999; margin-top: 4px">将整体替换该用户的角色，用户重新登录后生效。</div>
      </t-loading>
      <t-space style="margin-top: 12px">
        <t-button theme="primary" @click="confirm">确认分配</t-button>
        <t-button variant="outline" @click="cancel">取消</t-button>
      </t-space>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { RoleVO } from '@/api/system/role/types';
import { getAuthRole, listUser } from '@/api/system/user';
import type { UserQuery, UserVO } from '@/api/system/user/types';
import { checkPermi } from '@/utils/permission';

import type { ResumeEntry } from '../../../api/types';

/**
 * AssignUserRoles 工具卡片（HITL，权限变更）。
 *
 * 注册为 `AssignUserRoles` 工具的渲染组件（见 register.ts）。按 args.userName 查到用户后，调授权角色接口
 * /system/user/authRole/:userId 取全部角色（flag 标记已拥有），与 args.roleKeys 比对出新增 / 移除 / 保留。
 * userId 取自列表接口的响应（后端 jsonx 已把超界 ID 转成字符串），不取 args —— 模型写的数字 ID 会丢精度。
 * 只有批准 / 拒绝，不回传改动；后端恢复时重新查现状、重算变更再执行，结果里回传实际生效的那份。
 */

/** 入参，对齐后端 assignUserRolesArgs。 */
interface AssignUserRolesArgs {
  userName?: string;
  roleKeys?: string[];
}

/** 返回值，对齐后端 assignUserRolesResult。added / removed / kept 是角色名。 */
interface AssignUserRolesResult {
  error?: string;
  cancelled?: boolean;
  message?: string;
  userName?: string;
  nickName?: string;
  added?: string[];
  removed?: string[];
  kept?: string[];
}

const props = defineProps<{
  status?: string;
  /** respond 之后、后端结果到达之前，渲染器会把 result 临时设成回传的 ResumeEntry 数组。 */
  result?: AssignUserRolesResult | ResumeEntry[];
  args?: AssignUserRolesArgs;
  respond?: (response: ResumeEntry[]) => void;
}>();

const done = computed(() =>
  props.status === 'complete' && props.result && !Array.isArray(props.result) ? props.result : undefined,
);
const submitted = computed(() => (Array.isArray(props.result) ? props.result[0]?.status : undefined));

/** 去空去重，口径与后端一致。 */
const roleKeys = computed(() => [...new Set((props.args?.roleKeys ?? []).map((k) => k.trim()).filter(Boolean))]);

const target = ref<UserVO | null>(null);
const roles = ref<RoleVO[] | null>(null);
const loading = ref(false);
const lookupHint = ref('');

const diff = computed(() => {
  if (!roles.value) return null;
  const want = new Set(roleKeys.value);
  // 只有启用中的角色可分配，与后端校验一致。
  const byKey = new Map(roles.value.filter((r) => r.status === '0').map((r) => [r.roleKey, r]));
  const owned = roles.value.filter((r) => r.flag);
  return {
    added: roleKeys.value.filter((k) => byKey.has(k) && !owned.some((r) => r.roleKey === k)).map((k) => byKey.get(k)!),
    removed: owned.filter((r) => !want.has(r.roleKey)),
    kept: owned.filter((r) => want.has(r.roleKey)),
    invalid: roleKeys.value.filter((k) => !byKey.has(k)),
  };
});

async function lookup(userName: string) {
  if (!checkPermi(['system:user:list'])) return;
  loading.value = true;
  try {
    // 账号条件是模糊匹配，在结果里挑出完全相等的那个。
    const res = await listUser({ userName, pageNum: 1, pageSize: 50 } as UserQuery);
    target.value = res?.data?.rows?.find((u) => u.userName === userName) ?? null;
    if (!target.value) {
      lookupHint.value = `找不到账号为 ${userName} 的用户`;
      return;
    }
    if (!checkPermi(['system:user:query'])) return;
    const auth = await getAuthRole(target.value.userId);
    roles.value = auth?.data?.roles ?? [];
  } catch {
    // 错误提示由 request 拦截器统一弹出；查不到现状时退化为只列目标角色
  } finally {
    loading.value = false;
  }
}

// args 可能在组件挂载后才注入（JSON.parse 完成较晚）；只有待确认态需要查现状。
watch(
  () => props.args?.userName,
  (name) => {
    if (name && !done.value && !submitted.value) lookup(name);
  },
  { immediate: true },
);

function confirm() {
  props.respond?.([{ status: 'resolved' }]);
}

function cancel() {
  props.respond?.([{ status: 'cancelled' }]);
}
</script>
<style scoped>
.field {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 24px;
}
.label {
  flex: 0 0 56px;
  color: #999;
}
.value {
  color: #333;
  word-break: break-all;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 2px;
}
</style>
