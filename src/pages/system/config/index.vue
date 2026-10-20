<template>
  <div class="config-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">参数管理</div></template>
      <template #actions>
        <t-button v-hasPermi="['system:config:remove']" theme="danger" variant="outline" @click="handleRefreshCache"
          ><template #icon><refresh-icon /></template>刷新缓存</t-button
        >
      </template>

      <t-tabs v-model="activeTab" class="config-tabs" @change="handleTabChange">
        <t-tab-panel label="全部" value="all" />
        <t-tab-panel label="自定义" value="custom" />
      </t-tabs>

      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="参数名称" name="configName"
          ><t-input v-model="queryParams.configName" clearable placeholder="请输入参数名称"
        /></t-form-item>
        <t-form-item label="参数键名" name="configKey"
          ><t-input v-model="queryParams.configKey" clearable placeholder="请输入参数键名"
        /></t-form-item>
        <t-form-item label="系统内置" name="configType"
          ><dict-select v-model="queryParams.configType" placeholder="是否内置" style="width: 160px" type="sys_yes_no"
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
        <t-button v-hasPermi="['system:config:add']" theme="primary" @click="handleAdd"
          ><template #icon><add-icon /></template>新增</t-button
        >
        <t-button
          v-hasPermi="['system:config:edit']"
          :disabled="single"
          theme="success"
          variant="outline"
          @click="handleUpdate()"
          ><template #icon><edit-icon /></template>修改</t-button
        >
        <t-popconfirm content="是否确认删除选中的参数?" @confirm="handleDelete()">
          <t-button v-hasPermi="['system:config:remove']" :disabled="multiple" theme="danger" variant="outline"
            ><template #icon><delete-icon /></template>删除</t-button
          >
        </t-popconfirm>
        <t-button v-hasPermi="['system:config:export']" theme="warning" variant="outline" @click="handleExport"
          ><template #icon><download-icon /></template>导出</t-button
        >
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="sys_config_column_visible"
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
        row-key="configId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #configType="{ row }"><dict-tag :options="sys_yes_no" :value="row.configType" /></template>
        <template #configValue="{ row }">
          <t-input
            v-if="row.configType === 'N'"
            v-model="row.configValue"
            borderless
            @blur="handleInlineSave(row)"
            @enter="handleInlineSave(row)"
          />
          <span v-else>{{ row.configValue }}</span>
        </template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['system:config:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:config:remove']" hover="color" theme="danger">删除</t-link>
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
      width="560px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="90px" @submit="onSubmit">
        <t-form-item label="参数名称" name="configName"
          ><t-input v-model="form.configName" placeholder="请输入参数名称"
        /></t-form-item>
        <t-form-item label="参数键名" name="configKey"
          ><t-input v-model="form.configKey" placeholder="请输入参数键名"
        /></t-form-item>
        <t-form-item label="参数键值" name="configValue"
          ><t-textarea v-model="form.configValue" :autosize="{ minRows: 2 }" placeholder="请输入参数键值"
        /></t-form-item>
        <t-form-item label="系统内置" name="configType"
          ><dict-select v-model="form.configType" placeholder="请选择" type="sys_yes_no"
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
import { MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, DeleteIcon, DownloadIcon, EditIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { ConfigForm, ConfigQuery, ConfigVO } from '@/api/system/config/types';
import { addConfig, delConfig, listConfig, refreshCache, updateConfig, updateConfigByKey } from '@/api/system/config';
import { download } from '@/utils/request';
import { useDict } from '@/utils/dict';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemConfig' });

const { sys_yes_no } = useDict('sys_yes_no');

const list = ref<ConfigVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<ConfigVO[]>([]);
const single = computed(() => selectedRows.value.length !== 1);
const multiple = computed(() => selectedRows.value.length === 0);
const showSearch = ref(true);

// 全部 / 自定义 配置 Tab：自定义仅显示非系统内置（configType='N'），可直接行内编辑
const activeTab = ref('all');
const handleTabChange = (val: string | number) => {
  queryParams.configType = val === 'custom' ? 'N' : '';
  handleQuery();
};

const queryParams = reactive<ConfigQuery>({ pageNum: 1, pageSize: 10, configName: '', configKey: '', configType: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'configId', title: '参数主键', width: 100, align: 'center' },
  { colKey: 'configName', title: '参数名称', width: 180 },
  { colKey: 'configKey', title: '参数键名', width: 220, ellipsis: true },
  { colKey: 'configValue', title: '参数键值', width: 220, ellipsis: true },
  { colKey: 'configType', title: '系统内置', width: 100, align: 'center' },
  { colKey: 'remark', title: '备注', ellipsis: true, minWidth: 140 },
  { colKey: 'createTime', title: '创建时间', width: 180 },
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
    const res = await listConfig(queryParams);
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
  queryParams.configName = '';
  queryParams.configKey = '';
  queryParams.configType = activeTab.value === 'custom' ? 'N' : '';
  handleQuery();
};
const handleExport = () => download('/system/config/export', { ...queryParams }, `config_${Date.now()}.xlsx`);
const handleRefreshCache = async () => {
  await refreshCache();
  MessagePlugin.success('刷新缓存成功');
};
// 行内保存：非内置参数直接编辑 configValue，失焦/回车即调用 updateConfigByKey
const handleInlineSave = async (row: ConfigVO) => {
  try {
    await updateConfigByKey(row.configKey, row.configValue ?? '');
    MessagePlugin.success('修改成功');
  } catch {
    // 失败时重新加载还原
    getList();
  }
};

const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const initForm = (): ConfigForm => ({
  configId: undefined,
  configName: '',
  configKey: '',
  configValue: '',
  configType: 'Y',
  remark: '',
});
const form = reactive<ConfigForm>(initForm());
const rules: Record<string, FormRule[]> = {
  configName: [{ required: true, message: '请输入参数名称', type: 'error' }],
  configKey: [{ required: true, message: '请输入参数键名', type: 'error' }],
  configValue: [{ required: true, message: '请输入参数键值', type: 'error' }],
};

const handleAdd = () => {
  Object.assign(form, initForm());
  dialogTitle.value = '新增参数';
  dialogVisible.value = true;
};
const handleUpdate = (row?: ConfigVO) => {
  const t = row ?? selectedRows.value[0];
  if (!t) return;
  Object.assign(form, initForm(), {
    configId: t.configId,
    configName: t.configName,
    configKey: t.configKey,
    configValue: t.configValue,
    configType: t.configType,
    remark: t.remark,
  });
  dialogTitle.value = '修改参数';
  dialogVisible.value = true;
};
const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.configId) {
      await updateConfig(form);
      MessagePlugin.success('修改成功');
    } else {
      await addConfig(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};
const handleDelete = async (row?: ConfigVO) => {
  const ids = row ? [row.configId] : selectedRows.value.map((r) => r.configId);
  if (!ids.length) return;
  await delConfig(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

getList();
</script>

<style lang="less" scoped>
.config-page {
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
