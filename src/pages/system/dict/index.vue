<template>
  <div class="dict-page">
    <t-card :bordered="false">
      <template #title>
        <div class="card-title">字典管理</div>
      </template>
      <template #actions>
        <t-button v-hasPermi="['system:dict:remove']" theme="danger" variant="outline" @click="handleRefreshCache">
          <template #icon><refresh-icon /></template>
          刷新缓存
        </t-button>
        <t-button v-hasPermi="['system:dict:export']" theme="warning" variant="outline" @click="handleTypeExport">
          <template #icon><download-icon /></template>
          导出
        </t-button>
      </template>

      <!-- 搜索区 -->
      <t-form v-show="showSearch" :data="typeQueryParams" layout="inline" @submit="handleTypeQuery">
        <t-form-item label="字典名称" name="dictName">
          <t-input v-model="typeQueryParams.dictName" clearable placeholder="请输入字典名称" />
        </t-form-item>
        <t-form-item label="字典类型" name="dictType">
          <t-input v-model="typeQueryParams.dictType" clearable placeholder="请输入字典类型" />
        </t-form-item>
        <t-form-item :style="{ marginLeft: 'auto' }">
          <t-space>
            <t-button theme="primary" type="submit">
              <template #icon><search-icon /></template>
              搜索
            </t-button>
            <t-button theme="default" variant="base" @click="handleTypeReset">
              <template #icon><refresh-icon /></template>
              重置
            </t-button>
          </t-space>
        </t-form-item>
      </t-form>

      <!-- 操作区 -->
      <div class="toolbar">
        <t-button v-hasPermi="['system:dict:add']" theme="primary" @click="handleTypeAdd">
          <template #icon><add-icon /></template>
          新增
        </t-button>
        <t-button
          v-hasPermi="['system:dict:edit']"
          :disabled="typeSingle"
          theme="success"
          variant="outline"
          @click="handleTypeUpdate()"
        >
          <template #icon><edit-icon /></template>
          修改
        </t-button>
        <t-popconfirm content="是否确认删除选中的字典类型?" @confirm="handleTypeDelete()">
          <t-button v-hasPermi="['system:dict:remove']" :disabled="typeMultiple" theme="danger" variant="outline">
            <template #icon><delete-icon /></template>
            删除
          </t-button>
        </t-popconfirm>
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="typeColumns"
          class="toolbar-right"
          storage-key="sys_dict_column_visible"
          @query-table="getTypeList"
        />
      </div>

      <!-- 类型表格 -->
      <t-table
        :columns="realTypeColumns"
        :data="typeList"
        :loading="typeLoading"
        :pagination="typePagination"
        :selected-row-keys="typeSelectedKeys"
        hover
        row-key="dictId"
        stripe
        @select-change="onTypeSelectChange"
        @row-click="handleTypeRowClick"
        @page-change="onTypePageChange"
      >
        <template #dictType="{ row }">
          <t-link hover="color" theme="primary" @click.stop="openDataDrawer(row)">{{ row.dictType }}</t-link>
        </template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['system:dict:edit']" hover="color" theme="primary" @click.stop="handleTypeUpdate(row)"
              >修改</t-link
            >
            <t-link v-hasPermi="['system:dict:list']" hover="color" theme="primary" @click.stop="openDataDrawer(row)"
              >数据</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleTypeDelete(row)">
              <t-link v-hasPermi="['system:dict:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 新增/修改 类型 弹窗 -->
    <t-dialog
      v-model:visible="typeDialogVisible"
      :confirm-btn="{ loading: typeSubmitting }"
      :header="typeDialogTitle"
      :on-confirm="onTypeSubmit"
      width="520px"
    >
      <t-form ref="typeFormRef" :data="typeForm" :rules="typeRules" label-width="90px" @submit="onTypeSubmit">
        <t-form-item label="字典名称" name="dictName">
          <t-input v-model="typeForm.dictName" placeholder="请输入字典名称" />
        </t-form-item>
        <t-form-item label="字典类型" name="dictType">
          <t-input v-model="typeForm.dictType" :disabled="!!typeForm.dictId" placeholder="请输入字典类型" />
        </t-form-item>
        <t-form-item label="备注" name="remark">
          <t-textarea v-model="typeForm.remark" :autosize="{ minRows: 2 }" placeholder="请输入备注" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 字典数据 抽屉 -->
    <t-drawer v-model:visible="dataDrawerVisible" :header="`字典数据 - ${currentType?.dictType ?? ''}`" size="60%">
      <div class="drawer-body">
        <t-form :data="dataQueryParams" layout="inline" @submit="handleDataQuery">
          <t-form-item label="字典标签" name="dictLabel">
            <t-input v-model="dataQueryParams.dictLabel" clearable placeholder="请输入字典标签" />
          </t-form-item>
          <t-form-item>
            <t-space>
              <t-button theme="primary" type="submit">搜索</t-button>
              <t-button theme="default" @click="handleDataReset">重置</t-button>
            </t-space>
          </t-form-item>
        </t-form>

        <div class="toolbar">
          <t-button v-hasPermi="['system:dict:add']" theme="primary" @click="handleDataAdd">
            <template #icon><add-icon /></template>
            新增
          </t-button>
          <t-button v-hasPermi="['system:dict:export']" theme="warning" variant="outline" @click="handleDataExport">
            <template #icon><download-icon /></template>
            导出
          </t-button>
        </div>

        <t-table
          :columns="dataColumns"
          :data="dataList"
          :loading="dataLoading"
          :pagination="dataPagination"
          hover
          row-key="dictCode"
          stripe
          @page-change="onDataPageChange"
        >
          <template #dictLabel="{ row }">
            <t-tag :theme="tagTheme(row.listClass)" variant="light-outline">{{ row.dictLabel }}</t-tag>
          </template>
          <template #operation="{ row }">
            <t-space size="small">
              <t-link v-hasPermi="['system:dict:edit']" hover="color" theme="primary" @click="handleDataUpdate(row)"
                >修改</t-link
              >
              <t-popconfirm content="是否确认删除?" @confirm="handleDataDelete(row)">
                <t-link v-hasPermi="['system:dict:remove']" hover="color" theme="danger">删除</t-link>
              </t-popconfirm>
            </t-space>
          </template>
        </t-table>
      </div>
    </t-drawer>

    <!-- 新增/修改 字典数据 弹窗 -->
    <t-dialog
      v-model:visible="dataDialogVisible"
      :confirm-btn="{ loading: dataSubmitting }"
      :header="dataDialogTitle"
      :on-confirm="onDataSubmit"
      width="480px"
    >
      <t-form ref="dataFormRef" :data="dataForm" :rules="dataRules" label-width="90px" @submit="onDataSubmit">
        <t-form-item label="数据标签" name="dictLabel">
          <t-input v-model="dataForm.dictLabel" placeholder="请输入数据标签" />
        </t-form-item>
        <t-form-item label="数据键值" name="dictValue">
          <t-input v-model="dataForm.dictValue" placeholder="请输入数据键值" />
        </t-form-item>
        <t-form-item label="显示排序" name="dictSort">
          <t-input-number v-model="dataForm.dictSort" :min="0" />
        </t-form-item>
        <t-form-item label="回显样式" name="listClass">
          <t-select v-model="dataForm.listClass" clearable placeholder="请选择">
            <t-option
              v-for="o in tagOptions"
              :key="o.value"
              :label="`${o.label}(${o.value || 'default'})`"
              :value="o.value"
            />
          </t-select>
          <div class="list-class-preview">
            预览：
            <t-tag :theme="tagTheme(dataForm.listClass)" variant="light-outline">{{
              dataForm.dictLabel || '字典标签'
            }}</t-tag>
          </div>
        </t-form-item>
        <t-form-item label="CSS Class" name="cssClass">
          <t-input v-model="dataForm.cssClass" placeholder="请输入 CSS Class" />
        </t-form-item>
        <t-form-item label="备注" name="remark">
          <t-textarea v-model="dataForm.remark" :autosize="{ minRows: 2 }" placeholder="请输入备注" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, DeleteIcon, DownloadIcon, EditIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { DictDataForm, DictDataVO } from '@/api/system/dict/data/types';
import { addData, delData, listData, updateData } from '@/api/system/dict/data';
import type { DictTypeForm, DictTypeQuery, DictTypeVO } from '@/api/system/dict/type/types';
import { addType, delType, listType, refreshCache, updateType } from '@/api/system/dict/type';
import { useDictStore } from '@/store/modules/dict';
import { download } from '@/utils/request';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemDict' });

const dictStore = useDictStore();

// ============== 字典类型 ==============
const typeList = ref<DictTypeVO[]>([]);
const typeLoading = ref(false);
const typeSelectedKeys = ref<(string | number)[]>([]);
const typeSelectedRows = ref<DictTypeVO[]>([]);

const typeQueryParams = reactive<DictTypeQuery>({
  pageNum: 1,
  pageSize: 10,
  dictName: '',
  dictType: '',
});

const typePagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
});

const typeSingle = computed(() => typeSelectedRows.value.length !== 1);
const typeMultiple = computed(() => typeSelectedRows.value.length === 0);
const showSearch = ref(true);

const typeColumnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'dictName', title: '字典名称', width: 160, ellipsis: true },
  { colKey: 'dictType', title: '字典类型', width: 200 },
  { colKey: 'remark', title: '备注', ellipsis: true, minWidth: 160 },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 200, fixed: 'right', align: 'center' },
];
const typeColumns = ref<PrimaryTableCol[]>(typeColumnsData);
const realTypeColumns = computed<PrimaryTableCol[]>(() => {
  const all = typeColumns.value as any[];
  return all.filter((c: any) => c.visible !== false) as unknown as PrimaryTableCol[];
});

const getTypeList = async () => {
  typeLoading.value = true;
  try {
    const res = await listType(typeQueryParams);
    const data = res?.data;
    typeList.value = data?.rows ?? [];
    typePagination.total = data?.total ?? 0;
    typePagination.current = typeQueryParams.pageNum;
    typePagination.pageSize = typeQueryParams.pageSize;
  } finally {
    typeLoading.value = false;
  }
};

const onTypeSelectChange = (selectedKeys: (string | number)[], options: any) => {
  typeSelectedKeys.value = selectedKeys;
  typeSelectedRows.value = options?.selectedRowData ?? [];
};

const onTypePageChange = (pageInfo: PageInfo) => {
  typeQueryParams.pageNum = pageInfo.current;
  typeQueryParams.pageSize = pageInfo.pageSize;
  getTypeList();
};

const handleTypeQuery = () => {
  typeQueryParams.pageNum = 1;
  getTypeList();
};

const handleTypeReset = () => {
  typeQueryParams.dictName = '';
  typeQueryParams.dictType = '';
  handleTypeQuery();
};

const handleTypeRowClick = (context: any) => {
  openDataDrawer(context.row);
};

// ---- 类型表单 ----
const typeFormRef = ref<FormInstanceFunctions>();
const typeDialogVisible = ref(false);
const typeDialogTitle = ref('');
const typeSubmitting = ref(false);
const typeForm = reactive<DictTypeForm>({
  dictId: undefined,
  dictName: '',
  dictType: '',
  remark: '',
});

const typeRules: Record<string, FormRule[]> = {
  dictName: [{ required: true, message: '请输入字典名称', type: 'error' }],
  dictType: [{ required: true, message: '请输入字典类型', type: 'error' }],
};

const resetTypeForm = () => {
  typeForm.dictId = undefined;
  typeForm.dictName = '';
  typeForm.dictType = '';
  typeForm.remark = '';
};

const handleTypeAdd = () => {
  resetTypeForm();
  typeDialogTitle.value = '新增字典类型';
  typeDialogVisible.value = true;
};

const handleTypeUpdate = async (row?: DictTypeVO) => {
  const target = row ?? typeSelectedRows.value[0];
  if (!target) return;
  resetTypeForm();
  Object.assign(typeForm, {
    dictId: target.dictId,
    dictName: target.dictName,
    dictType: target.dictType,
    remark: target.remark,
  });
  typeDialogTitle.value = '修改字典类型';
  typeDialogVisible.value = true;
};

const onTypeSubmit = async () => {
  const valid = await typeFormRef.value?.validate();
  if (valid !== true) return;
  typeSubmitting.value = true;
  try {
    if (typeForm.dictId) {
      await updateType(typeForm);
      // 清掉旧字典类型缓存，下次渲染重新拉取
      if (typeForm.dictType) dictStore.removeDict(typeForm.dictType);
      MessagePlugin.success('修改成功');
    } else {
      await addType(typeForm);
      MessagePlugin.success('新增成功');
    }
    typeDialogVisible.value = false;
    getTypeList();
  } finally {
    typeSubmitting.value = false;
  }
};

const handleTypeDelete = async (row?: DictTypeVO) => {
  const ids = row ? [row.dictId] : typeSelectedRows.value.map((r) => r.dictId);
  if (!ids.length) return;
  await delType(ids);
  // 清掉被删字典类型的缓存
  (row ? [row] : typeSelectedRows.value).forEach((r) => r.dictType && dictStore.removeDict(r.dictType));
  MessagePlugin.success('删除成功');
  typeSelectedKeys.value = [];
  typeSelectedRows.value = [];
  getTypeList();
};

const handleTypeExport = () => {
  download('/system/dict/type/export', { ...typeQueryParams }, `dict_type_${new Date().getTime()}.xlsx`);
};

const handleRefreshCache = async () => {
  await refreshCache();
  // 清空前端字典缓存，DictTag/DictSelect 才会重新拉取
  dictStore.cleanDict();
  MessagePlugin.success('刷新缓存成功');
};

// ============== 字典数据 ==============
const dataDrawerVisible = ref(false);
const currentType = ref<DictTypeVO | null>(null);
const dataList = ref<DictDataVO[]>([]);
const dataLoading = ref(false);

const dataQueryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  dictType: '',
  dictLabel: '',
});

const dataPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
});

const tagOptions = [
  { label: '默认', value: '' },
  { label: '主要', value: 'primary' },
  { label: '成功', value: 'success' },
  { label: '警告', value: 'warning' },
  { label: '危险', value: 'danger' },
  { label: '信息', value: 'info' },
];

const tagTheme = (listClass?: string) => {
  const map: Record<string, string> = {
    primary: 'primary',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'default',
    '': 'default',
  };
  return (map[listClass ?? ''] ?? 'default') as any;
};

const dataColumns: PrimaryTableCol[] = [
  { colKey: 'dictLabel', title: '数据标签', width: 160 },
  { colKey: 'dictValue', title: '数据键值', width: 160 },
  { colKey: 'dictSort', title: '排序', width: 80, align: 'center' },
  { colKey: 'remark', title: '备注', ellipsis: true, minWidth: 120 },
  { colKey: 'operation', title: '操作', width: 160, fixed: 'right', align: 'center' },
];

const getDataList = async () => {
  if (!currentType.value) return;
  dataLoading.value = true;
  try {
    const res = await listData({ ...dataQueryParams, dictType: currentType.value.dictType });
    const data = res?.data;
    dataList.value = data?.rows ?? [];
    dataPagination.total = data?.total ?? 0;
    dataPagination.current = dataQueryParams.pageNum;
    dataPagination.pageSize = dataQueryParams.pageSize;
  } finally {
    dataLoading.value = false;
  }
};

const openDataDrawer = (row: DictTypeVO) => {
  currentType.value = row;
  dataQueryParams.dictType = row.dictType;
  dataQueryParams.dictLabel = '';
  dataQueryParams.pageNum = 1;
  dataDrawerVisible.value = true;
  getDataList();
};

const onDataPageChange = (pageInfo: PageInfo) => {
  dataQueryParams.pageNum = pageInfo.current;
  dataQueryParams.pageSize = pageInfo.pageSize;
  getDataList();
};

const handleDataQuery = () => {
  dataQueryParams.pageNum = 1;
  getDataList();
};

const handleDataReset = () => {
  dataQueryParams.dictLabel = '';
  handleDataQuery();
};

// ---- 数据表单 ----
const dataFormRef = ref<FormInstanceFunctions>();
const dataDialogVisible = ref(false);
const dataDialogTitle = ref('');
const dataSubmitting = ref(false);
const dataForm = reactive<DictDataForm>({
  dictCode: undefined,
  dictType: '',
  dictLabel: '',
  dictValue: '',
  cssClass: '',
  listClass: '',
  dictSort: 0,
  remark: '',
});

const dataRules: Record<string, FormRule[]> = {
  dictLabel: [{ required: true, message: '请输入数据标签', type: 'error' }],
  dictValue: [{ required: true, message: '请输入数据键值', type: 'error' }],
  dictSort: [{ required: true, message: '请输入显示排序', type: 'error' }],
};

const resetDataForm = () => {
  dataForm.dictCode = undefined;
  dataForm.dictType = currentType.value?.dictType ?? '';
  dataForm.dictLabel = '';
  dataForm.dictValue = '';
  dataForm.cssClass = '';
  dataForm.listClass = '';
  dataForm.dictSort = 0;
  dataForm.remark = '';
};

const handleDataAdd = () => {
  resetDataForm();
  dataDialogTitle.value = '新增字典数据';
  dataDialogVisible.value = true;
};

const handleDataUpdate = (row: DictDataVO) => {
  resetDataForm();
  Object.assign(dataForm, {
    dictCode: row.dictCode,
    dictType: currentType.value?.dictType ?? '',
    dictLabel: row.dictLabel,
    dictValue: row.dictValue,
    cssClass: row.cssClass,
    listClass: row.listClass,
    dictSort: row.dictSort,
    remark: row.remark,
  });
  dataDialogTitle.value = '修改字典数据';
  dataDialogVisible.value = true;
};

const onDataSubmit = async () => {
  const valid = await dataFormRef.value?.validate();
  if (valid !== true) return;
  dataSubmitting.value = true;
  try {
    if (dataForm.dictCode) {
      await updateData(dataForm);
      MessagePlugin.success('修改成功');
    } else {
      await addData(dataForm);
      MessagePlugin.success('新增成功');
    }
    // 字典数据变更后清掉该类型缓存
    if (dataForm.dictType) dictStore.removeDict(dataForm.dictType);
    dataDialogVisible.value = false;
    getDataList();
  } finally {
    dataSubmitting.value = false;
  }
};

const handleDataDelete = async (row: DictDataVO) => {
  await delData(row.dictCode);
  if (currentType.value?.dictType) dictStore.removeDict(currentType.value.dictType);
  MessagePlugin.success('删除成功');
  getDataList();
};

const handleDataExport = () => {
  if (!currentType.value) return;
  download(
    '/system/dict/data/export',
    { ...dataQueryParams, dictType: currentType.value.dictType },
    `dict_data_${new Date().getTime()}.xlsx`,
  );
};

// 初始化
getTypeList();
</script>

<style lang="less" scoped>
.dict-page {
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
.drawer-body {
  padding: 0 8px 16px;
}
.list-class-preview {
  margin-top: 6px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
