<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 SafeTool 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="done?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 修改个人资料失败</div>
      <div style="font-size: 12px; color: #666">{{ done.error }}</div>
    </template>

    <template v-else-if="done?.cancelled">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #888">已取消修改</div>
      <div style="font-size: 12px; color: #666">{{ done.message || '个人资料未变更。' }}</div>
    </template>

    <!-- 已完成：后端回传实际生效的前后对比 -->
    <template v-else-if="done">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 个人资料已更新</div>
      <div v-for="c in done.changes ?? []" :key="c.field" class="field">
        <span class="label">{{ c.label }}</span>
        <span class="value">
          <span class="before">{{ c.before || '（空）' }}</span>
          <span class="arrow">→</span>
          <span class="after">{{ c.after }}</span>
        </span>
      </div>
    </template>

    <!-- 已响应、等待后端执行结果 -->
    <template v-else-if="submitted">
      <div style="font-size: 12px; color: #999">
        {{ submitted === 'cancelled' ? '已取消，等待助手回复...' : '已确认，正在保存...' }}
      </div>
    </template>

    <!-- 待确认：用户核对（可修改）将要写入的值 -->
    <template v-else>
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px">请确认修改个人资料</div>
      <t-space direction="vertical" size="large" style="width: 100%">
        <div v-for="f in fields" :key="f.key">
          <div class="form-label">
            {{ f.label }}
            <span class="current">当前：{{ current[f.key] || '（空）' }}</span>
            <t-tag v-if="isChanged(f.key)" size="small" theme="warning" variant="light">将修改</t-tag>
          </div>
          <t-input v-model="form[f.key]" :maxlength="f.maxlength" clearable placeholder="留空不改" />
        </div>
        <div v-if="!hasChange" style="font-size: 12px; color: #e34d59">没有要修改的内容</div>
        <t-space>
          <t-button :disabled="!hasChange" theme="primary" @click="confirm">确认修改</t-button>
          <t-button variant="outline" @click="cancel">取消</t-button>
        </t-space>
      </t-space>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, onMounted, reactive, watch } from 'vue';

import { getUserProfile } from '@/api/system/user';

import type { ResumeEntry } from '../../../api/types';

/**
 * UpdateMyProfile 工具卡片（HITL）。
 *
 * 注册为 `UpdateMyProfile` 工具的渲染组件（见 register.ts）。后端中断后，卡片调个人中心接口取当前资料
 * （仅需登录，与工具一致），与模型给出的新值并排展示；用户可再修改，确认后把最终值作为 payload 回传。
 * 后端恢复时以 payload 为准并重新校验，故这里展示的就是将要写入的值。
 */

type ProfileField = 'nickName' | 'email' | 'phoneNumber';

/** 入参与用户响应，对齐后端 updateMyProfileArgs。 */
interface ProfileArgs {
  nickName?: string;
  email?: string;
  phoneNumber?: string;
}

/** 返回值，对齐后端 updateMyProfileResult。 */
interface UpdateMyProfileResult {
  error?: string;
  cancelled?: boolean;
  message?: string;
  changes?: { field: string; label: string; before: string; after: string }[];
}

const props = defineProps<{
  status?: string;
  /** respond 之后、后端结果到达之前，渲染器会把 result 临时设成回传的 ResumeEntry 数组。 */
  result?: UpdateMyProfileResult | ResumeEntry[];
  args?: ProfileArgs;
  respond?: (response: ResumeEntry[]) => void;
}>();

const fields: { key: ProfileField; label: string; maxlength: number }[] = [
  { key: 'nickName', label: '昵称', maxlength: 30 },
  { key: 'email', label: '邮箱', maxlength: 50 },
  { key: 'phoneNumber', label: '手机号', maxlength: 11 },
];

const done = computed(() =>
  props.status === 'complete' && props.result && !Array.isArray(props.result) ? props.result : undefined,
);
const submitted = computed(() => (Array.isArray(props.result) ? props.result[0]?.status : undefined));

const current = reactive<Record<ProfileField, string>>({ nickName: '', email: '', phoneNumber: '' });
const form = reactive<Record<ProfileField, string>>({ nickName: '', email: '', phoneNumber: '' });

// args 可能在组件挂载后才注入（JSON.parse 完成较晚），同步一次。
watch(
  () => props.args,
  (a) => {
    if (!a) return;
    form.nickName = a.nickName ?? form.nickName;
    form.email = a.email ?? form.email;
    form.phoneNumber = a.phoneNumber ?? form.phoneNumber;
  },
  { immediate: true },
);

onMounted(async () => {
  // 只有待确认态需要当前值；已完成的卡片（含刷新后从快照恢复的）不必再查。
  if (done.value || submitted.value) return;
  try {
    const res = await getUserProfile();
    const u = res?.data?.user;
    current.nickName = u?.nickName ?? '';
    current.email = u?.email ?? '';
    current.phoneNumber = u?.phoneNumber ?? '';
  } catch {
    // 错误提示由 request 拦截器统一弹出；拿不到当前值时只展示新值
  }
});

function isChanged(key: ProfileField) {
  const v = form[key].trim();
  return v !== '' && v !== current[key];
}

const hasChange = computed(() => fields.some((f) => isChanged(f.key)));

function confirm() {
  // 未改动的字段传空串：后端按「留空不改」处理。
  const payload: ProfileArgs = {};
  fields.forEach((f) => {
    payload[f.key] = isChanged(f.key) ? form[f.key].trim() : '';
  });
  props.respond?.([{ status: 'resolved', payload }]);
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
  flex: 0 0 56px;
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
.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
}
.current {
  color: #999;
}
</style>
