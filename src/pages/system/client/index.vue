<template>
  <div class="client-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">客户端管理</div></template>

      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="客户端key" name="clientKey"
          ><t-input v-model="queryParams.clientKey" clearable placeholder="请输入客户端key"
        /></t-form-item>
        <t-form-item label="客户端秘钥" name="clientSecret"
          ><t-input v-model="queryParams.clientSecret" clearable placeholder="请输入客户端秘钥"
        /></t-form-item>
        <t-form-item label="状态" name="status"
          ><dict-select v-model="queryParams.status" placeholder="状态" style="width: 140px" type="sys_normal_disable"
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
        <t-button v-hasPermi="['system:client:add']" theme="primary" @click="handleAdd"
          ><template #icon><add-icon /></template>新增</t-button
        >
        <t-button
          v-hasPermi="['system:client:edit']"
          :disabled="single"
          theme="success"
          variant="outline"
          @click="handleUpdate()"
          ><template #icon><edit-icon /></template>修改</t-button
        >
        <t-popconfirm content="是否确认删除选中的客户端?" @confirm="handleDelete()">
          <t-button v-hasPermi="['system:client:remove']" :disabled="multiple" theme="danger" variant="outline"
            ><template #icon><delete-icon /></template>删除</t-button
          >
        </t-popconfirm>
        <t-button v-hasPermi="['system:client:export']" theme="warning" variant="outline" @click="handleExport"
          ><template #icon><download-icon /></template>导出</t-button
        >
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="sys_client_column_visible"
          @query-table="getList"
        />
      </div>

      <t-table
        :columns="realColumns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedKeys"
        hover
        row-key="id"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #grantTypeList="{ row }">
          <t-tag v-for="g in row.grantTypeList" :key="g" style="margin-right: 4px" variant="light-outline">{{
            g
          }}</t-tag>
        </template>
        <template #deviceType="{ row }"><dict-tag :options="sys_device_type" :value="row.deviceType" /></template>
        <template #status="{ row }">
          <t-switch :value="row.status === '0'" @change="(v: any) => handleStatusChange(row, v)" />
        </template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['system:client:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:client:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <t-dialog
      v-model:visible="dialogVisible"
      :confirm-btn="{ loading: submitting }"
      :header="dialogTitle"
      :on-confirm="onSubmit"
      width="640px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="120px" @submit="onSubmit">
        <t-row>
          <t-col :span="6"
            ><t-form-item label="客户端key" name="clientKey"
              ><t-input v-model="form.clientKey" :disabled="!!form.id" placeholder="请输入客户端key" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="客户端秘钥" name="clientSecret"
              ><t-input v-model="form.clientSecret" :disabled="!!form.id" placeholder="请输入客户端秘钥" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="6"
            ><t-form-item label="授权类型" name="grantTypeList"
              ><dict-select
                v-model="form.grantTypeList"
                multiple
                placeholder="请选择"
                type="sys_grant_type" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="设备类型" name="deviceType"
              ><dict-select v-model="form.deviceType" placeholder="请选择" type="sys_device_type" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="6"
            ><t-form-item label="活跃超时(s)" name="activeTimeout"
              ><t-input-number v-model="form.activeTimeout" :min="-1"
            /></t-form-item>
            <div class="field-tip">-1 表示永不过期</div></t-col
          >
          <t-col :span="6"
            ><t-form-item label="固定超时(s)" name="timeout"
              ><t-input-number v-model="form.timeout" :min="-1"
            /></t-form-item>
            <div class="field-tip">-1 表示永不过期</div></t-col
          >
        </t-row>
        <t-form-item label="白名单路径" name="accessPath"
          ><t-textarea v-model="form.accessPath" :autosize="{ minRows: 3 }" placeholder="多个用换行分隔，示例：/app/**"
        /></t-form-item>
        <t-form-item label="白名单IP" name="ipWhitelist"
          ><t-textarea
            v-model="form.ipWhitelist"
            :autosize="{ minRows: 3 }"
            placeholder="多个用换行分隔，示例：192.168.1.1"
        /></t-form-item>
        <t-form-item label="状态" name="status"
          ><dict-select v-model="form.status" placeholder="请选择" type="sys_normal_disable"
        /></t-form-item>
        <t-form-item label="备注" name="remark"
          ><t-textarea v-model="form.remark" :autosize="{ minRows: 2 }" placeholder="请输入备注"
        /></t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, DeleteIcon, DownloadIcon, EditIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { ClientForm, ClientQuery, ClientVO } from '@/api/system/client/types';
import { addClient, changeStatus, delClient, listClient, updateClient } from '@/api/system/client';
import { download } from '@/utils/request';
import { useDict } from '@/utils/dict';

defineOptions({ name: 'SystemClient' });

const { sys_normal_disable, sys_device_type, sys_grant_type } = useDict(
  'sys_normal_disable',
  'sys_device_type',
  'sys_grant_type',
);

const list = ref<ClientVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<ClientVO[]>([]);
const single = computed(() => selectedRows.value.length !== 1);
const multiple = computed(() => selectedRows.value.length === 0);
const showSearch = ref(true);

const queryParams = reactive<ClientQuery>({ pageNum: 1, pageSize: 10, clientKey: '', clientSecret: '', status: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'clientId', title: '客户端编号', width: 160 },
  { colKey: 'clientKey', title: '客户端key', width: 200 },
  { colKey: 'clientSecret', title: '客户端秘钥', width: 220, ellipsis: true },
  { colKey: 'grantTypeList', title: '授权类型', width: 220 },
  { colKey: 'deviceType', title: '设备类型', width: 120, align: 'center' },
  { colKey: 'activeTimeout', title: '活跃超时', width: 100, align: 'center' },
  { colKey: 'timeout', title: '固定超时', width: 100, align: 'center' },
  { colKey: 'accessPath', title: '白名单路径', width: 180, ellipsis: true },
  { colKey: 'ipWhitelist', title: '白名单IP', width: 160, ellipsis: true },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
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
    const res = await listClient(queryParams);
    const data = res?.data;
    list.value = data?.rows ?? [];
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
  queryParams.clientKey = '';
  queryParams.clientSecret = '';
  queryParams.status = '';
  handleQuery();
};

const handleStatusChange = (row: ClientVO, v: any) => {
  const status = v ? '0' : '1';
  const text = v ? '启用' : '停用';
  const dialog = DialogPlugin.confirm({
    header: '系统提示',
    body: `确认要"${text}""${row.clientKey}"客户端吗?`,
    onConfirm: async () => {
      dialog.destroy();
      try {
        await changeStatus(row.clientId, status);
        row.status = status;
        MessagePlugin.success(`${text}成功`);
      } catch {
        /* ignore */
      }
    },
    onClose: () => dialog.destroy(),
  });
};

const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const initForm = (): ClientForm => ({
  id: undefined,
  clientId: undefined,
  clientKey: '',
  clientSecret: '',
  grantTypeList: [],
  deviceType: '',
  accessPath: '',
  ipWhitelist: '',
  activeTimeout: 1800,
  timeout: 604800,
  status: '0',
  remark: '',
});
const form = reactive<ClientForm>(initForm());
const rules: Record<string, FormRule[]> = {
  clientKey: [{ required: true, message: '请输入客户端key', type: 'error' }],
  clientSecret: [{ required: true, message: '请输入客户端秘钥', type: 'error' }],
  grantTypeList: [{ required: true, message: '请选择授权类型', type: 'error' }],
  deviceType: [{ required: true, message: '请选择设备类型', type: 'error' }],
};

const handleAdd = () => {
  Object.assign(form, initForm());
  dialogTitle.value = '新增客户端';
  dialogVisible.value = true;
};
const handleUpdate = (row?: ClientVO) => {
  const t = row ?? selectedRows.value[0];
  if (!t) return;
  Object.assign(form, initForm(), {
    id: t.id,
    clientId: t.clientId,
    clientKey: t.clientKey,
    clientSecret: t.clientSecret,
    grantTypeList: t.grantTypeList ?? [],
    deviceType: t.deviceType,
    accessPath: t.accessPath ?? '',
    ipWhitelist: t.ipWhitelist ?? '',
    activeTimeout: t.activeTimeout,
    timeout: t.timeout,
    status: t.status,
  });
  dialogTitle.value = '修改客户端';
  dialogVisible.value = true;
};
const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.id) {
      await updateClient(form);
      MessagePlugin.success('修改成功');
    } else {
      await addClient(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};
const handleDelete = async (row?: ClientVO) => {
  const ids = row ? [row.id] : selectedRows.value.map((r) => r.id);
  if (!ids.length) return;
  await delClient(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

const handleExport = () => download('/system/client/export', { ...queryParams }, `client_${Date.now()}.xlsx`);

getList();
</script>

<style lang="less" scoped>
.client-page {
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
.field-tip {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-top: -8px;
  margin-bottom: 8px;
}
</style>
