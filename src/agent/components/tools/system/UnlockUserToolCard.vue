<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 SafeTool 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="done?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 解锁用户失败</div>
      <div style="font-size: 12px; color: #666">{{ done.error }}</div>
    </template>

    <template v-else-if="done?.cancelled">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #888">已取消解锁</div>
      <div style="font-size: 12px; color: #666">{{ done.message || '账号状态未变更。' }}</div>
    </template>

    <template v-else-if="done">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 已解锁</div>
      <div class="field">
        <span class="label">用户</span>
        <span class="value">{{ done.nickName }}（{{ done.userName }}）</span>
      </div>
      <div class="field">
        <span class="label">密码错误次数</span>
        <span class="value">
          <span class="before">{{ done.errorCount ?? 0 }}</span>
          <span class="arrow">→</span>
          <span class="after">0</span>
        </span>
      </div>
    </template>

    <template v-else-if="submitted">
      <div style="font-size: 12px; color: #999">
        {{ submitted === 'cancelled' ? '已取消，等待助手回复...' : '已确认，正在解锁...' }}
      </div>
    </template>

    <!-- 待确认：展示要解锁的用户 -->
    <template v-else>
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px">请确认解锁用户</div>
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
        <div v-if="target" class="field">
          <span class="label">账号状态</span>
          <span class="value">{{ selectDictLabel(dict.sys_normal_disable, target.status) }}</span>
        </div>
        <div v-if="lookupHint" style="font-size: 12px; color: #e34d59; margin-top: 4px">{{ lookupHint }}</div>
        <div style="font-size: 12px; color: #999; margin-top: 4px">
          解锁会清空该账号的密码错误次数，使其可以立即重新登录。
        </div>
      </t-loading>
      <t-space style="margin-top: 12px">
        <t-button theme="primary" @click="confirm">确认解锁</t-button>
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
 * UnlockUser 工具卡片（HITL）。
 *
 * 注册为 `UnlockUser` 工具的渲染组件（见 register.ts）。卡片按 args.userName 调用户管理列表接口补全昵称与部门，
 * 只有批准 / 拒绝。列表接口要求 system:user:list，没有时只展示账号。
 * 密码错误次数只存在 Redis、没有 Web 接口，执行前看不到，结果里由后端回传解锁前的次数。
 */

/** 返回值，对齐后端 unlockUserResult。 */
interface UnlockUserResult {
  error?: string;
  cancelled?: boolean;
  message?: string;
  userName?: string;
  nickName?: string;
  errorCount?: number;
}

const props = defineProps<{
  status?: string;
  /** respond 之后、后端结果到达之前，渲染器会把 result 临时设成回传的 ResumeEntry 数组。 */
  result?: UnlockUserResult | ResumeEntry[];
  args?: { userName?: string };
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

// args 可能在组件挂载后才注入（JSON.parse 完成较晚）；只有待确认态需要查。
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
  line-height: 22px;
}
.label {
  flex: 0 0 84px;
  color: #999;
}
.value {
  color: #333;
  word-break: break-all;
}
.before {
  color: #999;
  text-decoration: line-through;
}
.arrow {
  margin: 0 6px;
  color: #999;
}
.after {
  color: #00a870;
}
</style>
