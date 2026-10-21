<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 已完成：展示后端返回的当前登录用户信息 -->
    <template v-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 当前登录用户</div>
      <t-space direction="vertical" size="small" style="width: 100%">
        <div class="field">
          <span class="label">账号</span>
          <span class="value">{{ result.userName || '-' }}</span>
        </div>
        <div class="field">
          <span class="label">昵称</span>
          <span class="value">{{ result.nickName || '-' }}</span>
        </div>
        <div v-if="result.deptName" class="field">
          <span class="label">部门</span>
          <span class="value">{{ result.deptName }}</span>
        </div>
        <div v-if="result.gender" class="field">
          <span class="label">性别</span>
          <span class="value">{{ result.gender }}</span>
        </div>
        <div v-if="result.email" class="field">
          <span class="label">邮箱</span>
          <span class="value">{{ result.email }}</span>
        </div>
        <div v-if="result.phoneNumber" class="field">
          <span class="label">手机</span>
          <span class="value">{{ result.phoneNumber }}</span>
        </div>
        <div v-if="result.roles?.length" class="field">
          <span class="label">角色</span>
          <span class="value">{{ result.roles.join('、') }}</span>
        </div>
        <div v-if="result.posts?.length" class="field">
          <span class="label">岗位</span>
          <span class="value">{{ result.posts.join('、') }}</span>
        </div>
        <div v-if="result.loginIp" class="field">
          <span class="label">最近登录 IP</span>
          <span class="value">{{ result.loginIp }}</span>
        </div>
        <div v-if="loginDateText" class="field">
          <span class="label">最近登录时间</span>
          <span class="value">{{ loginDateText }}</span>
        </div>
      </t-space>
    </template>

    <!-- 查询中：只读工具无入参表单，仅占位等待结果 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在查询当前登录用户...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed } from 'vue';

/**
 * GetCurrentUser 工具卡片（只读，非 HITL）。
 *
 * 注册为 `GetCurrentUser` 工具的渲染组件（见 register.ts）。后端 getCurrentUserInvoke 无入参、
 * 不走 StatefulInterrupt，直接返回 currentUserResult，故这里没有表单与 respond 回调，
 * 只负责把结果字段对齐后端 currentUserResult 展示出来。
 */

/** 返回值，对齐后端 currentUserResult（JSON tag 逐字段一致）。 */
interface CurrentUserResult {
  userId?: number;
  userName?: string;
  nickName?: string;
  deptName?: string;
  email?: string;
  phoneNumber?: string;
  gender?: string;
  roles?: string[];
  posts?: string[];
  loginIp?: string;
  loginDate?: string;
}

const props = defineProps<{
  status?: string;
  result?: CurrentUserResult;
  // GetCurrentUser 无入参，保留以兼容渲染器统一注入的 props 签名。
  args?: Record<string, never>;
  respond?: (response: unknown[]) => void;
}>();

/** loginDate 是 RFC3339 字符串，本地化为可读形式；解析失败原样回显。 */
const loginDateText = computed(() => {
  const raw = props.result?.loginDate;
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
</style>
