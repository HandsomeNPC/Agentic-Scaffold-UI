<template>
  <div class="auth-role-page">
    <t-card :bordered="false">
      <template #title
        ><span>分配角色 - {{ user?.userName || '' }}</span></template
      >
      <template #actions>
        <t-space>
          <t-button v-hasPermi="['system:user:edit']" :loading="submitting" theme="primary" @click="handleSubmit"
            >提交</t-button
          >
          <t-button theme="default" variant="outline" @click="close">返回</t-button>
        </t-space>
      </template>

      <t-descriptions :column="3" bordered class="user-info">
        <t-descriptions-item label="用户昵称">{{ user?.nickName }}</t-descriptions-item>
        <t-descriptions-item label="登录账号">{{ user?.userName }}</t-descriptions-item>
        <t-descriptions-item label="部门">{{ user?.deptName }}</t-descriptions-item>
      </t-descriptions>

      <div class="toolbar">
        <t-input v-model="roleFilter" clearable placeholder="角色名称筛选" style="width: 240px">
          <template #prefix-icon><t-icon name="search" /></template>
        </t-input>
      </div>

      <t-table :columns="columns" :data="filteredRoles" :loading="loading" hover row-key="roleId" stripe>
        <template #status="{ row }"><dict-tag :options="sys_normal_disable" :value="row.status" /></template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #check="{ row }">
          <t-checkbox
            :disabled="!checkSelectable(row)"
            :value="checkedKeys.includes(row.roleId)"
            @change="(v: any) => toggleRole(row.roleId, v)"
          />
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { RoleVO } from '@/api/system/role/types';
import { getAuthRole, updateAuthRole } from '@/api/system/user';
import { getTabsRouterStore } from '@/store/modules/tabs-router';
import { useDict } from '@/utils/dict';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'UserAuthRole' });

const route = useRoute();
const router = useRouter();
const userId = String(route.params.userId);

const { sys_normal_disable } = useDict('sys_normal_disable');

const user = ref<any>(null);
const roles = ref<RoleVO[]>([]);
const checkedKeys = ref<Array<string | number>>([]);
const loading = ref(false);
const roleFilter = ref('');
const submitting = ref(false);

const filteredRoles = computed(() => {
  const kw = roleFilter.value.trim().toLowerCase();
  if (!kw) return roles.value;
  return roles.value.filter((r) => r.roleName?.toLowerCase().includes(kw));
});

const columns: PrimaryTableCol[] = [
  { colKey: 'check', title: '选择', width: 80, align: 'center' },
  { colKey: 'roleId', title: '角色编号', width: 100, align: 'center' },
  { colKey: 'roleName', title: '角色名称', width: 200 },
  { colKey: 'roleKey', title: '权限字符', width: 200, ellipsis: true },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
];

const load = async () => {
  loading.value = true;
  try {
    const res = await getAuthRole(userId);
    const d = res?.data;
    user.value = d?.user ?? null;
    roles.value = d?.roles ?? [];
    // 后端在 roles[].flag 上标记该用户已拥有的角色（user.roleIds 不会被填充）
    checkedKeys.value = roles.value.filter((r) => r.flag).map((r) => r.roleId);
  } finally {
    loading.value = false;
  }
};

/** 停用角色不可分配 */
const checkSelectable = (row: RoleVO) => row.status === '0';

const toggleRole = (roleId: string | number, v: any) => {
  if (v) {
    if (!checkedKeys.value.includes(roleId)) checkedKeys.value = [...checkedKeys.value, roleId];
  } else {
    checkedKeys.value = checkedKeys.value.filter((k) => k !== roleId);
  }
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    await updateAuthRole({ userId, roleIds: checkedKeys.value.join(',') });
    MessagePlugin.success('分配成功');
    close();
  } finally {
    submitting.value = false;
  }
};

/** 提交/返回：关闭当前授权标签并回到用户列表 */
const close = () => {
  getTabsRouterStore().removeTabByPath(route.fullPath);
  router.replace('/system/user');
};

load();
</script>

<style lang="less" scoped>
.auth-role-page {
  padding: 16px;
}
.user-info {
  margin-bottom: 16px;
}
.toolbar {
  margin: 12px 0;
}
</style>
