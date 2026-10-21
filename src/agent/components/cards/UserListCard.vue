<template>
  <div class="agent-tool-card">
    <div class="agent-tool-card__head">
      <t-loading v-if="status !== 'complete'" size="small" />
      <user-icon v-else />
      <span>查询用户{{ data ? `（共 ${data.total} 条）` : '' }}</span>
      <t-link v-if="data" hover="color" theme="primary" @click="goto">在用户管理中查看</t-link>
    </div>
    <t-table
      v-if="data && data.rows.length"
      :columns="columns"
      :data="data.rows"
      :max-height="240"
      class="agent-tool-card__body"
      row-key="userId"
      size="small"
    />
  </div>
</template>
<script lang="ts" setup>
import { UserIcon } from 'tdesign-icons-vue-next';
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { computed } from 'vue';

import router from '@/router';

import type { ToolCardProps } from '../../tools';

interface UserBrief {
  userId: string | number;
  userName: string;
  nickName: string;
  deptName?: string;
  status: string;
}

const props = defineProps<ToolCardProps>();

const data = computed(() => {
  const r = props.result as { total?: number; rows?: UserBrief[] } | undefined;
  return r && Array.isArray(r.rows) ? { total: r.total ?? r.rows.length, rows: r.rows } : null;
});

const columns: PrimaryTableCol[] = [
  { colKey: 'userName', title: '账号', ellipsis: true },
  { colKey: 'nickName', title: '昵称', ellipsis: true },
  { colKey: 'deptName', title: '部门', ellipsis: true },
  { colKey: 'status', title: '状态', width: 64, cell: (_h, { row }) => (row.status === '0' ? '正常' : '停用') },
];

function goto() {
  router.push('/system/user').catch(() => {});
}
</script>
<style lang="less" scoped>
@import './card.less';
</style>
