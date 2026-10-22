<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法查询用户详情</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：展示目标用户详情 -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">
        ✓ 用户详情
        <t-tag
          v-if="result.status"
          :theme="result.status === '停用' ? 'danger' : 'success'"
          size="small"
          style="margin-left: 4px"
          variant="light"
        >
          {{ result.status }}
        </t-tag>
      </div>
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
        <div v-if="result.loginDate" class="field">
          <span class="label">最近登录时间</span>
          <span class="value">{{ formatTime(result.loginDate) }}</span>
        </div>
        <div v-if="result.createTime" class="field">
          <span class="label">创建时间</span>
          <span class="value">{{ formatTime(result.createTime) }}</span>
        </div>
        <div v-if="result.remark" class="field">
          <span class="label">备注</span>
          <span class="value">{{ result.remark }}</span>
        </div>
      </t-space>
    </template>

    <!-- 查询中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在查询用户详情...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
/**
 * GetUserDetail 工具卡片（只读，非 HITL）。
 *
 * 注册为 `GetUserDetail` 工具的渲染组件（见 register.ts）。字段口径对齐 GetCurrentUser 卡片，
 * 另加状态、创建时间与备注；性别、状态已由后端翻成文字。
 */

/** 返回值，对齐后端 userDetailResult（JSON tag 逐字段一致）。 */
interface UserDetailResult {
  error?: string;
  userId?: number | string;
  userName?: string;
  nickName?: string;
  deptName?: string;
  email?: string;
  phoneNumber?: string;
  gender?: string;
  status?: string;
  roles?: string[];
  posts?: string[];
  loginIp?: string;
  loginDate?: string;
  createTime?: string;
  remark?: string;
}

defineProps<{
  status?: string;
  result?: UserDetailResult;
  args?: { userId?: number | string };
  respond?: (response: unknown[]) => void;
}>();

/** 时间是 RFC3339 字符串，本地化为可读形式；解析失败原样回显。 */
function formatTime(raw?: string) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
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
