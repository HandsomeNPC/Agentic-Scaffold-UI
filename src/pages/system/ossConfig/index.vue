<template>
  <div class="oss-config-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">对象存储配置</div></template>

      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="配置key" name="configKey"
          ><t-input v-model="queryParams.configKey" clearable placeholder="配置key"
        /></t-form-item>
        <t-form-item label="桶名称" name="bucketName"
          ><t-input v-model="queryParams.bucketName" clearable placeholder="桶名称"
        /></t-form-item>
        <t-form-item label="状态" name="status"
          ><dict-select v-model="queryParams.status" placeholder="状态" style="width: 140px" type="sys_yes_no"
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
        <t-button v-hasPermi="['system:ossConfig:add']" theme="primary" @click="handleAdd"
          ><template #icon><add-icon /></template>新增</t-button
        >
        <t-popconfirm content="是否确认删除选中的配置?" @confirm="handleDelete()">
          <t-button
            v-hasPermi="['system:ossConfig:remove']"
            :disabled="!selectedRows.length"
            theme="danger"
            variant="outline"
            ><template #icon><delete-icon /></template>删除</t-button
          >
        </t-popconfirm>
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="sys_oss_config_column_visible"
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
        row-key="ossConfigId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #status="{ row }">
          <t-switch :value="row.status === 'Y'" @change="(v: any) => handleStatusChange(row, v)" />
        </template>
        <template #accessPolicy="{ row }">
          <t-tag v-if="row.accessPolicy === '0'" theme="warning" variant="light">private</t-tag>
          <t-tag v-else-if="row.accessPolicy === '1'" theme="success" variant="light">public</t-tag>
          <t-tag v-else-if="row.accessPolicy === '2'" theme="primary" variant="light">custom</t-tag>
        </template>
        <template #isHttps="{ row }"><dict-tag :options="sys_yes_no" :value="row.isHttps" /></template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['system:ossConfig:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:ossConfig:remove']" hover="color" theme="danger">删除</t-link>
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
      width="680px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="120px" @submit="onSubmit">
        <t-row>
          <t-col :span="6"
            ><t-form-item label="配置key" name="configKey"
              ><t-input
                v-model="form.configKey"
                :disabled="!!form.ossConfigId"
                placeholder="请输入配置key" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="访问站点" name="endpoint"
              ><t-input v-model="form.endpoint" placeholder="请输入访问站点" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="6"
            ><t-form-item label="自定义域名" name="domainUrl"
              ><t-input v-model="form.domainUrl" placeholder="请输入自定义域名" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="桶名称" name="bucketName"
              ><t-input v-model="form.bucketName" placeholder="请输入桶名称" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="6"
            ><t-form-item label="accessKey" name="accessKey"
              ><t-input v-model="form.accessKey" placeholder="请输入accessKey" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="secretKey" name="secretKey"
              ><t-input v-model="form.secretKey" placeholder="请输入秘钥" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="6"
            ><t-form-item label="前缀" name="prefix"
              ><t-input v-model="form.prefix" placeholder="请输入前缀" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="域" name="region"><t-input v-model="form.region" placeholder="请输入域" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="6"
            ><t-form-item label="是否HTTPS" name="isHttps"
              ><dict-select v-model="form.isHttps" placeholder="请选择" type="sys_yes_no" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="桶权限类型" name="accessPolicy"
              ><t-radio-group v-model="form.accessPolicy">
                <t-radio value="0">private</t-radio>
                <t-radio value="1">public</t-radio>
                <t-radio value="2">custom</t-radio>
              </t-radio-group></t-form-item
            ></t-col
          >
        </t-row>
        <t-form-item label="状态" name="status"
          ><dict-select v-model="form.status" placeholder="请选择" type="sys_yes_no"
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
import { AddIcon, DeleteIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { OssConfigForm, OssConfigQuery, OssConfigVO } from '@/api/system/ossConfig/types';
import {
  addOssConfig,
  changeOssConfigStatus,
  delOssConfig,
  listOssConfig,
  updateOssConfig,
} from '@/api/system/ossConfig';
import { useDict } from '@/utils/dict';

defineOptions({ name: 'SystemOssConfig' });

const { sys_yes_no } = useDict('sys_yes_no');

const list = ref<OssConfigVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<OssConfigVO[]>([]);
const showSearch = ref(true);
const queryParams = reactive<OssConfigQuery>({ pageNum: 1, pageSize: 10, configKey: '', bucketName: '', status: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'configKey', title: '配置key', width: 180 },
  { colKey: 'bucketName', title: '桶名称', width: 160 },
  { colKey: 'endpoint', title: '访问站点', width: 200, ellipsis: true },
  { colKey: 'domainUrl', title: '自定义域名', width: 200, ellipsis: true },
  { colKey: 'accessPolicy', title: '桶权限', width: 100, align: 'center' },
  { colKey: 'region', title: '域', width: 100 },
  { colKey: 'isHttps', title: 'HTTPS', width: 90, align: 'center' },
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
    const res = await listOssConfig(queryParams);
    const d = res?.data;
    list.value = d?.rows ?? [];
    pagination.total = d?.total ?? 0;
    pagination.current = queryParams.pageNum ?? 1;
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
  queryParams.configKey = '';
  queryParams.bucketName = '';
  queryParams.status = '';
  handleQuery();
};

const handleStatusChange = async (row: OssConfigVO, v: any) => {
  // 后端 status 语义是「是否默认」，取值 Y/N；切换会先清空其他默认再设当前
  const status = v ? 'Y' : 'N';
  try {
    await changeOssConfigStatus(row.ossConfigId, status, row.configKey);
    row.status = status;
    MessagePlugin.success('修改成功');
    getList();
  } catch {
    /* ignore */
  }
};

const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const initForm = (): OssConfigForm => ({
  ossConfigId: undefined,
  configKey: '',
  bucketName: '',
  prefix: '',
  endpoint: '',
  domainUrl: '',
  accessKey: '',
  secretKey: '',
  isHttps: 'N',
  accessPolicy: '1',
  region: '',
  status: 'N',
  remark: '',
});
const form = reactive<OssConfigForm>(initForm());
const rules: Record<string, FormRule[]> = {
  configKey: [{ required: true, message: '请输入配置key', type: 'error' }],
  endpoint: [{ required: true, message: 'endpoint不能为空', type: 'error' }],
  bucketName: [{ required: true, message: '请输入桶名称', type: 'error' }],
  accessPolicy: [{ required: true, message: 'accessPolicy不能为空', type: 'error' }],
  accessKey: [{ required: true, message: 'accessKey不能为空', type: 'error' }],
  secretKey: [{ required: true, message: 'secretKey不能为空', type: 'error' }],
};

const handleAdd = () => {
  Object.assign(form, initForm());
  dialogTitle.value = '新增配置';
  dialogVisible.value = true;
};
const handleUpdate = (row: OssConfigVO) => {
  Object.assign(form, initForm(), {
    ossConfigId: row.ossConfigId,
    configKey: row.configKey,
    bucketName: row.bucketName,
    prefix: row.prefix,
    endpoint: row.endpoint,
    domainUrl: row.domainUrl,
    accessKey: row.accessKey,
    secretKey: row.secretKey,
    isHttps: row.isHttps,
    accessPolicy: row.accessPolicy,
    region: row.region,
    status: row.status,
    remark: row.remark,
  });
  dialogTitle.value = '修改配置';
  dialogVisible.value = true;
};
const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.ossConfigId) {
      await updateOssConfig(form);
      MessagePlugin.success('修改成功');
    } else {
      await addOssConfig(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};
const handleDelete = async (row?: OssConfigVO) => {
  const ids = row ? [row.ossConfigId] : selectedRows.value.map((r) => r.ossConfigId);
  if (!ids.length) return;
  await delOssConfig(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

getList();
</script>

<style lang="less" scoped>
.oss-config-page {
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
