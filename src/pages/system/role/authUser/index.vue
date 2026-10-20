<template>
  <div class="auth-user-page">
    <t-card :bordered="false">
      <template #title>
        <span>授权用户 - {{ role?.roleName || '' }}</span>
      </template>
      <template #actions>
        <t-button theme="default" variant="outline" @click="close">返回</t-button>
      </template>

      <t-row :gutter="12">
        <!-- 已授权 -->
        <t-col :lg="6" :xs="12">
          <t-card :bordered="false" title="已授权用户">
            <t-form :data="allocQuery" layout="inline" @submit="loadAlloc">
              <t-form-item label="用户名称" name="userName"
                ><t-input v-model="allocQuery.userName" clearable placeholder="用户名称"
              /></t-form-item>
              <t-form-item label="手机" name="phoneNumber"
                ><t-input v-model="allocQuery.phoneNumber" clearable placeholder="手机号"
              /></t-form-item>
              <t-form-item><t-button theme="primary" type="submit">搜索</t-button></t-form-item>
            </t-form>
            <div class="toolbar">
              <t-popconfirm content="批量取消授权选中的用户?" @confirm="handleCancelAll">
                <t-button
                  v-hasPermi="['system:role:edit']"
                  :disabled="!allocSelectedRows.length"
                  theme="danger"
                  variant="outline"
                  >批量取消</t-button
                >
              </t-popconfirm>
            </div>
            <t-table
              :columns="columns"
              :data="allocList"
              :loading="allocLoading"
              :pagination="allocPg"
              :selected-row-keys="allocKeys"
              hover
              row-key="userId"
              stripe
              @select-change="onAllocSelect"
              @page-change="(p: any) => onAllocPage(p)"
            >
              <template #status="{ row }"><dict-tag :options="sys_normal_disable" :value="row.status" /></template>
              <template #operation="{ row }">
                <t-popconfirm content="确认取消该用户授权?" @confirm="handleCancel(row)">
                  <t-link v-hasPermi="['system:role:edit']" hover="color" theme="danger">取消授权</t-link>
                </t-popconfirm>
              </template>
            </t-table>
          </t-card>
        </t-col>

        <!-- 未授权 -->
        <t-col :lg="6" :xs="12">
          <t-card :bordered="false" title="未授权用户">
            <t-form :data="unallocQuery" layout="inline" @submit="loadUnalloc">
              <t-form-item label="用户名称" name="userName"
                ><t-input v-model="unallocQuery.userName" clearable placeholder="用户名称"
              /></t-form-item>
              <t-form-item label="手机" name="phoneNumber"
                ><t-input v-model="unallocQuery.phoneNumber" clearable placeholder="手机号"
              /></t-form-item>
              <t-form-item><t-button theme="primary" type="submit">搜索</t-button></t-form-item>
            </t-form>
            <div class="toolbar">
              <t-button
                v-hasPermi="['system:role:edit']"
                :disabled="!unallocSelectedRows.length"
                theme="primary"
                @click="handleSelectAll"
                >批量授权</t-button
              >
            </div>
            <t-table
              :columns="columns"
              :data="unallocList"
              :loading="unallocLoading"
              :pagination="unallocPg"
              :selected-row-keys="unallocKeys"
              hover
              row-key="userId"
              stripe
              @select-change="onUnallocSelect"
              @page-change="(p: any) => onUnallocPage(p)"
            >
              <template #status="{ row }"><dict-tag :options="sys_normal_disable" :value="row.status" /></template>
              <template #operation="{ row }">
                <t-link
                  v-hasPermi="['system:role:edit']"
                  hover="color"
                  theme="primary"
                  @click="handleSelect([row.userId])"
                  >授权</t-link
                >
              </template>
            </t-table>
          </t-card>
        </t-col>
      </t-row>
    </t-card>
  </div>
</template>

<script lang="ts" setup>
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { UserQuery, UserVO } from '@/api/system/user/types';
import {
  allocatedUserList,
  authUserCancel,
  authUserCancelAll,
  authUserSelectAll,
  getRole,
  unallocatedUserList,
} from '@/api/system/role';
import { getTabsRouterStore } from '@/store/modules/tabs-router';
import { useDict } from '@/utils/dict';

defineOptions({ name: 'RoleAuthUser' });

const route = useRoute();
const router = useRouter();
const roleId = String(route.params.roleId);

/** 返回：关闭当前授权标签并回到角色列表 */
const close = () => {
  getTabsRouterStore().removeTabByPath(route.fullPath);
  router.replace('/system/role');
};

const { sys_normal_disable } = useDict('sys_normal_disable');

const role = ref<{ roleName?: string } | null>(null);
const loadRole = async () => {
  const res = await getRole(roleId);
  role.value = res?.data ?? null;
};

const columns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'userName', title: '用户名称', width: 140 },
  { colKey: 'nickName', title: '昵称', width: 140 },
  { colKey: 'phoneNumber', title: '手机', width: 140 },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
  { colKey: 'operation', title: '操作', width: 140, align: 'center' },
];

// 已授权
const allocList = ref<UserVO[]>([]);
const allocLoading = ref(false);
const allocKeys = ref<(string | number)[]>([]);
const allocSelectedRows = ref<UserVO[]>([]);
const allocQuery = reactive<UserQuery>({ pageNum: 1, pageSize: 10, roleId, userName: '', phoneNumber: '' });
const allocPg = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const loadAlloc = async () => {
  allocLoading.value = true;
  try {
    const res = await allocatedUserList(allocQuery);
    const d = res?.data;
    allocList.value = d?.rows ?? [];
    allocPg.total = d?.total ?? 0;
    allocPg.current = allocQuery.pageNum ?? 1;
  } finally {
    allocLoading.value = false;
  }
};
const onAllocSelect = (keys: (string | number)[], options: any) => {
  allocKeys.value = keys;
  allocSelectedRows.value = options?.selectedRowData ?? [];
};
const onAllocPage = (p: PageInfo) => {
  allocQuery.pageNum = p.current;
  allocQuery.pageSize = p.pageSize;
  loadAlloc();
};

// 未授权
const unallocList = ref<UserVO[]>([]);
const unallocLoading = ref(false);
const unallocKeys = ref<(string | number)[]>([]);
const unallocSelectedRows = ref<UserVO[]>([]);
const unallocQuery = reactive<UserQuery>({ pageNum: 1, pageSize: 10, roleId, userName: '', phoneNumber: '' });
const unallocPg = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const loadUnalloc = async () => {
  unallocLoading.value = true;
  try {
    const res = await unallocatedUserList(unallocQuery);
    const d = res?.data;
    unallocList.value = d?.rows ?? [];
    unallocPg.total = d?.total ?? 0;
    unallocPg.current = unallocQuery.pageNum ?? 1;
  } finally {
    unallocLoading.value = false;
  }
};
const onUnallocSelect = (keys: (string | number)[], options: any) => {
  unallocKeys.value = keys;
  unallocSelectedRows.value = options?.selectedRowData ?? [];
};
const onUnallocPage = (p: PageInfo) => {
  unallocQuery.pageNum = p.current;
  unallocQuery.pageSize = p.pageSize;
  loadUnalloc();
};

const handleCancel = async (row: UserVO) => {
  await authUserCancel({ userId: row.userId, roleId });
  MessagePlugin.success('取消授权成功');
  loadAlloc();
  loadUnalloc();
};
const handleCancelAll = async () => {
  const userIds = allocSelectedRows.value.map((r) => r.userId).join(',');
  await authUserCancelAll({ roleId, userIds });
  MessagePlugin.success('批量取消成功');
  allocKeys.value = [];
  allocSelectedRows.value = [];
  loadAlloc();
  loadUnalloc();
};
const handleSelect = async (userIds: Array<string | number>) => {
  await authUserSelectAll({ roleId, userIds: userIds.join(',') });
  MessagePlugin.success('授权成功');
  loadAlloc();
  loadUnalloc();
};
const handleSelectAll = async () => {
  const userIds = unallocSelectedRows.value.map((r) => r.userId);
  if (!userIds.length) return;
  await handleSelect(userIds);
  unallocKeys.value = [];
  unallocSelectedRows.value = [];
};

loadRole();
loadAlloc();
loadUnalloc();
</script>

<style lang="less" scoped>
.auth-user-page {
  padding: 16px;
}
.toolbar {
  margin: 8px 0;
}
</style>
