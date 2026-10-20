<template>
  <div class="online-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">在线用户</div></template>

      <t-form :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="IP地址" name="ipaddr"
          ><t-input v-model="queryParams.ipaddr" clearable placeholder="请输入IP地址"
        /></t-form-item>
        <t-form-item label="用户名称" name="userName"
          ><t-input v-model="queryParams.userName" clearable placeholder="请输入用户名称"
        /></t-form-item>
        <t-form-item :style="{ marginLeft: 'auto' }">
          <t-space>
            <t-button theme="primary" type="submit"
              ><template #icon><search-icon /></template>搜索</t-button
            >
            <t-button theme="default" @click="resetQuery"
              ><template #icon><refresh-icon /></template>重置</t-button
            >
          </t-space>
        </t-form-item>
      </t-form>

      <div class="toolbar">
        <t-popconfirm content="是否强退选中的用户?" @confirm="handleForceLogout()">
          <t-button
            v-hasPermi="['monitor:online:forceLogout']"
            :disabled="!selectedRows.length"
            theme="danger"
            variant="outline"
            ><template #icon><poweroff-icon /></template>强退</t-button
          >
        </t-popconfirm>
      </div>

      <t-table
        :columns="columns"
        :data="listData"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedKeys"
        hover
        row-key="tokenId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #loginTime="{ row }">{{ parseTime(row.loginTime) }}</template>
        <template #deviceType="{ row }"><dict-tag :options="sys_device_type" :value="row.deviceType" /></template>
        <template #operation="{ row }">
          <t-popconfirm content="是否强退该用户?" @confirm="handleForceLogout(row)">
            <t-link v-hasPermi="['monitor:online:forceLogout']" hover="color" theme="danger">强退</t-link>
          </t-popconfirm>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script lang="ts" setup>
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { PoweroffIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { reactive, ref } from 'vue';

import type { OnlineQuery, OnlineVO } from '@/api/monitor/online/types';
import { forceLogout, list } from '@/api/monitor/online';
import { useDict } from '@/utils/dict';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'MonitorOnline' });

const { sys_device_type } = useDict('sys_device_type');

const listData = ref<OnlineVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<OnlineVO[]>([]);

const queryParams = reactive<OnlineQuery>({ pageNum: 1, pageSize: 10, ipaddr: '', userName: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'tokenId', title: '会话编号', width: 200, ellipsis: true },
  { colKey: 'userName', title: '用户名称', width: 140 },
  { colKey: 'deptName', title: '部门名称', width: 160 },
  { colKey: 'ipaddr', title: '主机', width: 160 },
  { colKey: 'loginLocation', title: '登录地点', width: 160 },
  { colKey: 'clientKey', title: '客户端', width: 110, ellipsis: true },
  { colKey: 'deviceType', title: '设备类型', width: 110, align: 'center' },
  { colKey: 'browser', title: '浏览器', width: 140 },
  { colKey: 'os', title: '操作系统', width: 160 },
  { colKey: 'loginTime', title: '登录时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 120, fixed: 'right', align: 'center' },
];

const getList = async () => {
  loading.value = true;
  try {
    const res = await list(queryParams);
    const data = res?.data;
    listData.value = data?.rows ?? [];
    pagination.total = data?.total ?? 0;
    pagination.current = queryParams.pageNum;
    pagination.pageSize = queryParams.pageSize;
  } finally {
    loading.value = false;
  }
};
const onSelectChange = (keys: (string | number)[], options: any) => {
  selectedKeys.value = keys;
  selectedRows.value = options?.selectedRowData ?? [];
};
const onPageChange = (p: PageInfo) => {
  queryParams.pageNum = p.current;
  queryParams.pageSize = p.pageSize;
  getList();
};
const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};
const resetQuery = () => {
  queryParams.ipaddr = '';
  queryParams.userName = '';
  handleQuery();
};

const handleForceLogout = async (row?: OnlineVO) => {
  const ids = row ? [row.tokenId] : selectedRows.value.map((r) => r.tokenId);
  if (!ids.length) return;
  await Promise.all(ids.map((id) => forceLogout(id)));
  MessagePlugin.success('强退成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

getList();
</script>

<style lang="less" scoped>
.online-page {
  padding: 16px;
}
.card-title {
  font-weight: 600;
}
.toolbar {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
</style>
