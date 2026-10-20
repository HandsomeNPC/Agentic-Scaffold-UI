<template>
  <div class="logininfo-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">登录日志</div></template>
      <template #actions>
        <t-popconfirm content="是否清空所有登录日志?" @confirm="handleClean">
          <t-button v-hasPermi="['monitor:logininfo:remove']" theme="danger" variant="outline"
            ><template #icon><delete-icon /></template>清空</t-button
          >
        </t-popconfirm>
      </template>

      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="用户名称" name="userName"
          ><t-input v-model="queryParams.userName" clearable placeholder="请输入用户名称"
        /></t-form-item>
        <t-form-item label="IP地址" name="ipaddr"
          ><t-input v-model="queryParams.ipaddr" clearable placeholder="请输入IP地址"
        /></t-form-item>
        <t-form-item label="状态" name="status"
          ><dict-select v-model="queryParams.status" placeholder="状态" style="width: 140px" type="sys_common_status"
        /></t-form-item>
        <t-form-item label="登录时间" name="dateRange">
          <t-date-range-picker v-model="dateRange" clearable style="width: 280px" value-type="YYYY-MM-DD HH:mm:ss" />
        </t-form-item>
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
        <t-popconfirm content="是否确认删除选中的登录日志?" @confirm="handleDelete()">
          <t-button
            v-hasPermi="['monitor:logininfo:remove']"
            :disabled="!selectedRows.length"
            theme="danger"
            variant="outline"
            ><template #icon><delete-icon /></template>删除</t-button
          >
        </t-popconfirm>
        <t-button v-hasPermi="['monitor:logininfo:export']" theme="warning" variant="outline" @click="handleExport"
          ><template #icon><download-icon /></template>导出</t-button
        >
        <t-button
          v-hasPermi="['monitor:logininfo:unlock']"
          :disabled="!selectedRows.length"
          theme="default"
          variant="outline"
          @click="handleUnlock"
          ><template #icon><lock-off-icon /></template>解锁</t-button
        >
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="monitor_logininfo_column_visible"
          @query-table="getList"
        />
      </div>

      <t-table
        :columns="realColumns"
        :data="listData"
        :default-sort="defaultSort"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedKeys"
        hover
        row-key="infoId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
        @sort-change="onSortChange"
      >
        <template #status="{ row }"><dict-tag :options="sys_common_status" :value="row.status" /></template>
        <template #deviceType="{ row }"><dict-tag :options="sys_device_type" :value="row.deviceType" /></template>
        <template #loginTime="{ row }">{{ parseTime(row.loginTime) }}</template>
        <template #operation="{ row }">
          <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
            <t-link v-hasPermi="['monitor:logininfo:remove']" hover="color" theme="danger">删除</t-link>
          </t-popconfirm>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script lang="ts" setup>
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { DeleteIcon, DownloadIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { LockOffIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { LoginInfoQuery, LoginInfoVO } from '@/api/monitor/loginInfo/types';
import { cleanLoginInfo, delLoginInfo, list, unlockLoginInfo } from '@/api/monitor/loginInfo';
import { useDateRangeQuery } from '@/hooks/useDateRangeQuery';
import { download } from '@/utils/request';
import { useDict } from '@/utils/dict';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'MonitorLogininfo' });

const { sys_common_status, sys_device_type } = useDict('sys_common_status', 'sys_device_type');
const { dateRange, applyDateRange, resetDateRange } = useDateRangeQuery();

const listData = ref<LoginInfoVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<LoginInfoVO[]>([]);
const showSearch = ref(true);
const defaultSort = [{ sortBy: 'loginTime', descending: true }];

const queryParams = reactive<LoginInfoQuery>({
  pageNum: 1,
  pageSize: 10,
  userName: '',
  ipaddr: '',
  status: '',
  orderByColumn: 'loginTime',
  isAsc: 'desc',
});
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'infoId', title: '访问编号', width: 90, align: 'center' },
  { colKey: 'userName', title: '用户名称', width: 140, sorter: true },
  { colKey: 'ipaddr', title: 'IP地址', width: 150 },
  { colKey: 'loginLocation', title: '登录地点', width: 160, ellipsis: true },
  { colKey: 'clientKey', title: '客户端', width: 110, ellipsis: true },
  { colKey: 'deviceType', title: '设备类型', width: 110, align: 'center' },
  { colKey: 'browser', title: '浏览器', width: 140 },
  { colKey: 'os', title: '操作系统', width: 140 },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
  { colKey: 'msg', title: '描述', ellipsis: true, minWidth: 140 },
  { colKey: 'loginTime', title: '登录时间', width: 180, sorter: true },
  { colKey: 'operation', title: '操作', width: 120, fixed: 'right', align: 'center' },
];
const columns = ref<PrimaryTableCol[]>(columnsData);
const realColumns = computed<PrimaryTableCol[]>(() => {
  const all = columns.value as any[];
  return all.filter((c: any) => c.visible !== false) as unknown as PrimaryTableCol[];
});

const getList = async () => {
  loading.value = true;
  try {
    const res = await list(applyDateRange(queryParams));
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
const onSortChange = (sort: any) => {
  const s = Array.isArray(sort) ? sort[0] : sort;
  if (s?.sortBy) {
    queryParams.orderByColumn = s.sortBy;
    queryParams.isAsc = s.descending ? 'desc' : 'asc';
  } else {
    queryParams.orderByColumn = 'loginTime';
    queryParams.isAsc = 'desc';
  }
  queryParams.pageNum = 1;
  getList();
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
  queryParams.userName = '';
  queryParams.ipaddr = '';
  queryParams.status = '';
  resetDateRange();
  handleQuery();
};
const handleExport = () => download('/monitor/loginInfo/export', { ...queryParams }, `logininfor_${Date.now()}.xlsx`);
const handleDelete = async (row?: LoginInfoVO) => {
  const ids = row ? [row.infoId] : selectedRows.value.map((r) => r.infoId);
  if (!ids.length) return;
  await delLoginInfo(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};
const handleUnlock = async () => {
  const names = selectedRows.value.map((r) => r.userName);
  if (!names.length) return;
  await Promise.all(names.map((n) => unlockLoginInfo(n)));
  MessagePlugin.success('解锁成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};
const handleClean = async () => {
  await cleanLoginInfo();
  MessagePlugin.success('清空成功');
  getList();
};

getList();
</script>

<style lang="less" scoped>
.logininfo-page {
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
.toolbar-right {
  margin-left: auto;
}
</style>
