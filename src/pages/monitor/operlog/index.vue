<template>
  <div class="operlog-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">操作日志</div></template>
      <template #actions>
        <t-popconfirm content="是否清空所有操作日志?" @confirm="handleClean">
          <t-button v-hasPermi="['monitor:operlog:remove']" theme="danger" variant="outline"
            ><template #icon><delete-icon /></template>清空</t-button
          >
        </t-popconfirm>
      </template>

      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="系统模块" name="title"
          ><t-input v-model="queryParams.title" clearable placeholder="请输入系统模块"
        /></t-form-item>
        <t-form-item label="操作人员" name="operName"
          ><t-input v-model="queryParams.operName" clearable placeholder="请输入操作人员"
        /></t-form-item>
        <t-form-item label="操作地址" name="operIp"
          ><t-input v-model="queryParams.operIp" clearable placeholder="请输入操作地址"
        /></t-form-item>
        <t-form-item label="客户端" name="clientKey"
          ><t-input v-model="queryParams.clientKey" clearable placeholder="请输入客户端"
        /></t-form-item>
        <t-form-item label="设备类型" name="deviceType"
          ><dict-select
            v-model="queryParams.deviceType"
            placeholder="设备类型"
            style="width: 140px"
            type="sys_device_type"
        /></t-form-item>
        <t-form-item label="操作系统" name="os"
          ><t-input v-model="queryParams.os" clearable placeholder="请输入操作系统"
        /></t-form-item>
        <t-form-item label="浏览器" name="browser"
          ><t-input v-model="queryParams.browser" clearable placeholder="请输入浏览器"
        /></t-form-item>
        <t-form-item label="操作类型" name="businessType"
          ><dict-select
            v-model="queryParams.businessType"
            placeholder="操作类型"
            style="width: 160px"
            type="sys_oper_type"
        /></t-form-item>
        <t-form-item label="状态" name="status"
          ><dict-select v-model="queryParams.status" placeholder="状态" style="width: 140px" type="sys_common_status"
        /></t-form-item>
        <t-form-item label="操作时间" name="dateRange">
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
        <t-popconfirm content="是否确认删除选中的操作日志?" @confirm="handleDelete()">
          <t-button
            v-hasPermi="['monitor:operlog:remove']"
            :disabled="!selectedRows.length"
            theme="danger"
            variant="outline"
            ><template #icon><delete-icon /></template>删除</t-button
          >
        </t-popconfirm>
        <t-button v-hasPermi="['monitor:operlog:export']" theme="warning" variant="outline" @click="handleExport"
          ><template #icon><download-icon /></template>导出</t-button
        >
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="monitor_operlog_column_visible"
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
        row-key="operId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
        @sort-change="onSortChange"
      >
        <template #businessType="{ row }"><dict-tag :options="sys_oper_type" :value="row.businessType" /></template>
        <template #status="{ row }"><dict-tag :options="sys_common_status" :value="row.status" /></template>
        <template #deviceType="{ row }"><dict-tag :options="sys_device_type" :value="row.deviceType" /></template>
        <template #operTime="{ row }">{{ parseTime(row.operTime) }}</template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['monitor:operlog:query']" hover="color" theme="primary" @click="handleDetail(row)"
              >详细</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['monitor:operlog:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <t-drawer v-model:visible="detailVisible" :footer="false" header="操作日志详细" size="500px">
      <t-descriptions v-if="current" :column="1" bordered>
        <t-descriptions-item label="操作模块">{{ current.title }}</t-descriptions-item>
        <t-descriptions-item label="请求方法">{{ current.method }}</t-descriptions-item>
        <t-descriptions-item label="请求方式">{{ current.requestMethod }}</t-descriptions-item>
        <t-descriptions-item label="操作人员">{{ current.operName }}</t-descriptions-item>
        <t-descriptions-item label="部门名称">{{ current.deptName || '-' }}</t-descriptions-item>
        <t-descriptions-item label="客户端">{{ current.clientKey || '-' }}</t-descriptions-item>
        <t-descriptions-item label="设备类型"
          ><dict-tag :options="sys_device_type" :value="current.deviceType"
        /></t-descriptions-item>
        <t-descriptions-item label="操作系统">{{ current.os || '-' }}</t-descriptions-item>
        <t-descriptions-item label="浏览器">{{ current.browser || '-' }}</t-descriptions-item>
        <t-descriptions-item label="操作类型"
          ><dict-tag :options="sys_oper_type" :value="current.businessType"
        /></t-descriptions-item>
        <t-descriptions-item label="操作状态">
          <dict-tag :options="sys_common_status" :value="current.status" />
        </t-descriptions-item>
        <t-descriptions-item label="操作IP">{{ current.operIp }}</t-descriptions-item>
        <t-descriptions-item label="操作地点">{{ current.operLocation }}</t-descriptions-item>
        <t-descriptions-item label="请求地址">{{ current.operUrl }}</t-descriptions-item>
        <t-descriptions-item label="请求参数">
          <pre class="json-block">{{ prettyJson(current.operParam) }}</pre>
        </t-descriptions-item>
        <t-descriptions-item label="返回结果">
          <pre class="json-block">{{ prettyJson(current.jsonResult) }}</pre>
        </t-descriptions-item>
        <t-descriptions-item v-if="Number(current.status) === 1" label="错误消息">{{
          current.errorMsg
        }}</t-descriptions-item>
        <t-descriptions-item label="操作时间">{{ parseTime(current.operTime) }}</t-descriptions-item>
        <t-descriptions-item label="耗时(ms)">{{ current.costTime }}</t-descriptions-item>
      </t-descriptions>
    </t-drawer>
  </div>
</template>

<script lang="ts" setup>
import type { PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { DeleteIcon, DownloadIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { OperLogQuery, OperLogVO } from '@/api/monitor/operlog/types';
import { cleanOperlog, delOperlog, list } from '@/api/monitor/operlog';
import { useDateRangeQuery } from '@/hooks/useDateRangeQuery';
import { download } from '@/utils/request';
import { useDict } from '@/utils/dict';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'MonitorOperlog' });

const { sys_oper_type, sys_common_status, sys_device_type } = useDict(
  'sys_oper_type',
  'sys_common_status',
  'sys_device_type',
);
const { dateRange, applyDateRange, resetDateRange } = useDateRangeQuery();

const listData = ref<OperLogVO[]>([]);
const loading = ref(false);
const detailVisible = ref(false);
const current = ref<OperLogVO | null>(null);
const showSearch = ref(true);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<OperLogVO[]>([]);
const defaultSort = [{ sortBy: 'operTime', descending: true }];

const prettyJson = (raw?: string) => {
  if (!raw) return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

const queryParams = reactive<OperLogQuery>({
  pageNum: 1,
  pageSize: 10,
  title: '',
  operName: '',
  operIp: '',
  clientKey: '',
  deviceType: '',
  os: '',
  browser: '',
  businessType: '',
  status: '',
  orderByColumn: 'operTime',
  isAsc: 'desc',
});
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columnsData: PrimaryTableCol[] = [
  { colKey: 'operId', title: '日志编号', width: 90, align: 'center' },
  { colKey: 'title', title: '系统模块', width: 160 },
  { colKey: 'businessType', title: '操作类型', width: 100, align: 'center' },
  { colKey: 'operName', title: '操作人员', width: 120, sorter: true },
  { colKey: 'deptName', title: '部门名称', width: 160, ellipsis: true },
  { colKey: 'operIp', title: '主机', width: 140 },
  { colKey: 'operLocation', title: '操作地点', width: 160, ellipsis: true },
  { colKey: 'clientKey', title: '客户端', width: 110, ellipsis: true },
  { colKey: 'deviceType', title: '设备类型', width: 110, align: 'center' },
  { colKey: 'os', title: '操作系统', width: 130, ellipsis: true },
  { colKey: 'browser', title: '浏览器', width: 130, ellipsis: true },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
  { colKey: 'operTime', title: '操作时间', width: 180, sorter: true },
  { colKey: 'costTime', title: '消耗(ms)', width: 100, align: 'center', sorter: true },
  { colKey: 'operation', title: '操作', width: 160, fixed: 'right', align: 'center' },
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
    queryParams.orderByColumn = 'operTime';
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
  queryParams.title = '';
  queryParams.operName = '';
  queryParams.operIp = '';
  queryParams.clientKey = '';
  queryParams.deviceType = '';
  queryParams.os = '';
  queryParams.browser = '';
  queryParams.businessType = '';
  queryParams.status = '';
  resetDateRange();
  handleQuery();
};
const handleExport = () => download('/monitor/operlog/export', { ...queryParams }, `operlog_${Date.now()}.xlsx`);
const handleDetail = (row: OperLogVO) => {
  current.value = row;
  detailVisible.value = true;
};
const handleDelete = async (row?: OperLogVO) => {
  const ids = row ? [row.operId] : selectedRows.value.map((r) => r.operId);
  if (!ids.length) return;
  await delOperlog(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};
const handleClean = async () => {
  await cleanOperlog();
  MessagePlugin.success('清空成功');
  getList();
};

getList();
</script>

<style lang="less" scoped>
.operlog-page {
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
.json-block {
  margin: 0;
  max-height: 200px;
  overflow: auto;
  padding: 8px;
  background: var(--td-bg-color-secondarycontainer);
  border-radius: var(--td-radius-default);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
