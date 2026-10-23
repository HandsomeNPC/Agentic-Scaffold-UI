<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 SafeTool 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="done?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 变更用户状态失败</div>
      <div style="font-size: 12px; color: #666">{{ done.error }}</div>
    </template>

    <template v-else-if="done?.cancelled">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #888">已取消操作</div>
      <div style="font-size: 12px; color: #666">{{ done.message || '账号状态未变更。' }}</div>
    </template>

    <template v-else-if="done">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 账号状态已变更</div>
      <div class="field">
        <span class="label">用户</span>
        <span class="value">{{ done.nickName }}（{{ done.userName }}）</span>
      </div>
      <div class="field">
        <span class="label">状态</span>
        <span class="value">
          <t-tag :theme="statusTheme(done.before)" size="small" variant="light">{{ statusLabel(done.before) }}</t-tag>
          <span class="arrow">→</span>
          <t-tag :theme="statusTheme(done.after)" size="small" variant="light">{{ statusLabel(done.after) }}</t-tag>
        </span>
      </div>
    </template>

    <template v-else-if="submitted">
      <div style="font-size: 12px; color: #999">
        {{ submitted === 'cancelled' ? '已取消，等待助手回复...' : '已确认，正在执行...' }}
      </div>
    </template>

    <!-- 待确认：展示目标用户的当前状态与将要变成的状态 -->
    <template v-else>
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px">请确认变更用户状态</div>
      <t-loading :loading="loading" size="small">
        <div class="field">
          <span class="label">账号</span>
          <span class="value">{{ args?.userName || '-' }}</span>
        </div>
        <div v-if="target" class="field">
          <span class="label">昵称</span>
          <span class="value">{{ target.nickName }}</span>
        </div>
        <div v-if="target?.deptName" class="field">
          <span class="label">部门</span>
          <span class="value">{{ target.deptName }}</span>
        </div>
        <div class="field">
          <span class="label">状态</span>
          <span class="value">
            <template v-if="target">
              <t-tag :theme="statusTheme(target.status)" size="small" variant="light">
                {{ statusLabel(target.status) }}
              </t-tag>
              <span class="arrow">→</span>
            </template>
            <t-tag :theme="statusTheme(args?.status)" size="small" variant="light">
              {{ statusLabel(args?.status) }}
            </t-tag>
          </span>
        </div>
        <div v-if="lookupHint" style="font-size: 12px; color: #e34d59; margin-top: 4px">{{ lookupHint }}</div>
        <div v-if="args?.status === '1'" style="font-size: 12px; color: #e37318; margin-top: 4px">
          停用后该用户将无法登录。
        </div>
      </t-loading>
      <t-space style="margin-top: 12px">
        <t-button :theme="args?.status === '1' ? 'danger' : 'primary'" @click="confirm">
          确认{{ args?.status === '1' ? '停用' : '启用' }}
        </t-button>
        <t-button variant="outline" @click="cancel">取消</t-button>
      </t-space>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { listUser } from '@/api/system/user';
import type { UserQuery, UserVO } from '@/api/system/user/types';
import { useDict } from '@/utils/dict';
import { checkPermi } from '@/utils/permission';
import { selectDictLabel } from '@/utils/ruoyi';

import type { ResumeEntry } from '../../../api/types';

/**
 * ChangeUserStatus 工具卡片（HITL）。
 *
 * 注册为 `ChangeUserStatus` 工具的渲染组件（见 register.ts）。卡片按 args.userName 调用户管理列表接口
 * 查目标用户的当前状态，与目标状态并排展示（前后对比）；只有批准 / 拒绝，不回传改动 —— 后端恢复时也只认
 * 中断时保存的入参。列表接口要求 system:user:list，没有时只展示账号与目标状态。
 */

/** 入参，对齐后端 changeUserStatusArgs。 */
interface ChangeUserStatusArgs {
  userName?: string;
  status?: string;
}

/** 返回值，对齐后端 changeUserStatusResult。before / after 是 sys_normal_disable 字典键值，渲染时翻成文字。 */
interface ChangeUserStatusResult {
  error?: string;
  cancelled?: boolean;
  message?: string;
  userName?: string;
  nickName?: string;
  before?: string;
  after?: string;
}

const props = defineProps<{
  status?: string;
  /** respond 之后、后端结果到达之前，渲染器会把 result 临时设成回传的 ResumeEntry 数组。 */
  result?: ChangeUserStatusResult | ResumeEntry[];
  args?: ChangeUserStatusArgs;
  respond?: (response: ResumeEntry[]) => void;
}>();

const done = computed(() =>
  props.status === 'complete' && props.result && !Array.isArray(props.result) ? props.result : undefined,
);
const submitted = computed(() => (Array.isArray(props.result) ? props.result[0]?.status : undefined));

// 不解构：字典未缓存时 useDict 异步赋值，解构出来的会一直是初始的空数组。
const dict = useDict('sys_normal_disable');

const target = ref<UserVO | null>(null);
const loading = ref(false);
const lookupHint = ref('');

function statusLabel(value?: string) {
  return value ? selectDictLabel(dict.sys_normal_disable, value) : '-';
}

function statusTheme(value?: string) {
  return value === '1' ? 'danger' : 'success';
}

/** 账号条件是模糊匹配，在结果里挑出完全相等的那个。 */
async function lookup(userName: string) {
  if (!checkPermi(['system:user:list'])) return;
  loading.value = true;
  try {
    const res = await listUser({ userName, pageNum: 1, pageSize: 50 } as UserQuery);
    target.value = res?.data?.rows?.find((u) => u.userName === userName) ?? null;
    lookupHint.value = target.value ? '' : `找不到账号为 ${userName} 的用户`;
  } catch {
    // 错误提示由 request 拦截器统一弹出
  } finally {
    loading.value = false;
  }
}

// args 可能在组件挂载后才注入（JSON.parse 完成较晚）；只有待确认态需要查当前状态。
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
  align-items: center;
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
.arrow {
  margin: 0 6px;
  color: #999;
}
</style>
