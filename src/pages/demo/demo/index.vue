<template>
  <div class="demo-demo-page">
    <t-card :bordered="false">
      <template #title>
        <div class="card-title">测试单列表</div>
      </template>

      <!-- 搜索 -->
      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="key键" name="testKey">
          <t-input v-model="queryParams.testKey" clearable placeholder="请输入key键" />
        </t-form-item>
        <t-form-item label="值" name="value">
          <t-input v-model="queryParams.value" clearable placeholder="请输入值" />
        </t-form-item>
        <t-form-item :style="{ marginLeft: 'auto' }">
          <t-space>
            <t-button theme="primary" type="submit">
              <template #icon><search-icon /></template>
              搜索
            </t-button>
            <t-button theme="default" @click="resetQuery">
              <template #icon><refresh-icon /></template>
              重置
            </t-button>
          </t-space>
        </t-form-item>
      </t-form>

      <!-- 工具栏 -->
      <div class="toolbar">
        <t-button v-hasPermi="['demo:demo:add']" theme="primary" @click="handleAdd">
          <template #icon><add-icon /></template>
          新增
        </t-button>
        <t-button
          v-hasPermi="['demo:demo:edit']"
          :disabled="single"
          theme="success"
          variant="outline"
          @click="handleUpdate()"
        >
          <template #icon><edit-icon /></template>
          修改
        </t-button>
        <t-popconfirm content="是否确认删除选中的测试单?" @confirm="handleDelete()">
          <t-button v-hasPermi="['demo:demo:remove']" :disabled="multiple" theme="danger" variant="outline">
            <template #icon><delete-icon /></template>
            删除
          </t-button>
        </t-popconfirm>
        <t-button v-hasPermi="['demo:demo:export']" theme="warning" variant="outline" @click="handleExport">
          <template #icon><download-icon /></template>
          导出
        </t-button>
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="demo_demo_column_visible"
          @query-table="getList"
        />
      </div>

      <!-- 表格 -->
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
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['demo:demo:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['demo:demo:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 新增/修改 弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :confirm-btn="{ loading: submitting }"
      :header="dialogTitle"
      :on-confirm="onSubmit"
      width="560px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="90px" @submit="onSubmit">
        <t-row>
          <t-col :span="6">
            <t-form-item label="部门id" name="deptId">
              <t-input v-model="form.deptId" placeholder="请输入部门id" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="用户id" name="userId">
              <t-input v-model="form.userId" placeholder="请输入用户id" />
            </t-form-item>
          </t-col>
        </t-row>
        <t-row>
          <t-col :span="6">
            <t-form-item label="排序号" name="orderNum">
              <t-input-number v-model="form.orderNum" :min="0" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="key键" name="testKey">
              <t-input v-model="form.testKey" placeholder="请输入key键" />
            </t-form-item>
          </t-col>
        </t-row>
        <t-row>
          <t-col :span="12">
            <t-form-item label="值" name="value">
              <t-input v-model="form.value" placeholder="请输入值" />
            </t-form-item>
          </t-col>
        </t-row>
      </t-form>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, DeleteIcon, DownloadIcon, EditIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { DemoForm, DemoQuery, DemoVO } from '@/api/demo/demo/types';
import { addDemo, delDemo, getDemo, listDemo, updateDemo } from '@/api/demo/demo';
import { download } from '@/utils/request';

defineOptions({ name: 'DemoDemo' });

const list = ref<DemoVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<DemoVO[]>([]);
const single = computed(() => selectedRows.value.length !== 1);
const multiple = computed(() => selectedRows.value.length === 0);
const showSearch = ref(true);

const queryParams = reactive<DemoQuery>({
  pageNum: 1,
  pageSize: 10,
  testKey: '',
  value: '',
});
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'id', title: '主键', width: 100, align: 'center' },
  { colKey: 'deptId', title: '部门id', width: 120, align: 'center' },
  { colKey: 'userId', title: '用户id', width: 120, align: 'center' },
  { colKey: 'orderNum', title: '排序号', width: 100, align: 'center' },
  { colKey: 'testKey', title: 'key键', width: 160 },
  { colKey: 'value', title: '值', ellipsis: true },
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
    const res = await listDemo(queryParams);
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
  queryParams.testKey = '';
  queryParams.value = '';
  handleQuery();
};

const handleExport = () => download('/demo/demo/export', { ...queryParams }, `demo_${Date.now()}.xlsx`);

// ---- 表单 ----
const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);

const initForm = (): DemoForm => ({
  id: undefined,
  deptId: undefined,
  userId: undefined,
  orderNum: undefined,
  testKey: '',
  value: '',
});
const form = reactive<DemoForm>(initForm());
const rules: Record<string, FormRule[]> = {
  testKey: [{ required: true, message: '请输入key键', type: 'error' }],
  value: [{ required: true, message: '请输入值', type: 'error' }],
  deptId: [{ required: true, message: '请输入部门id', type: 'error' }],
  userId: [{ required: true, message: '请输入用户id', type: 'error' }],
  orderNum: [{ required: true, message: '请输入显示排序', type: 'error' }],
};

const handleAdd = () => {
  Object.assign(form, initForm());
  dialogTitle.value = '新增测试单';
  dialogVisible.value = true;
};
const handleUpdate = async (row?: DemoVO) => {
  const t = row ?? selectedRows.value[0];
  const id = t?.id;
  if (id === undefined) return;
  const res = await getDemo(id);
  Object.assign(form, initForm(), res?.data ?? {});
  dialogTitle.value = '修改测试单';
  dialogVisible.value = true;
};
const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.id) {
      await updateDemo(form);
      MessagePlugin.success('修改成功');
    } else {
      await addDemo(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};
const handleDelete = async (row?: DemoVO) => {
  const ids = row ? [row.id] : selectedRows.value.map((r) => r.id);
  if (!ids.length) return;
  await delDemo(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

getList();
</script>

<style lang="less" scoped>
.demo-demo-page {
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
