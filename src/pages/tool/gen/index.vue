<template>
  <div class="gen-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">代码生成</div></template>

      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="表名称" name="tableName"
          ><t-input v-model="queryParams.tableName" clearable placeholder="请输入表名称"
        /></t-form-item>
        <t-form-item label="表描述" name="tableComment"
          ><t-input v-model="queryParams.tableComment" clearable placeholder="请输入表描述"
        /></t-form-item>
        <t-form-item label="数据源" name="dataName">
          <t-select v-model="queryParams.dataName" clearable placeholder="数据源" style="width: 140px">
            <t-option v-for="n in dataNames" :key="n" :label="n" :value="n" />
          </t-select>
        </t-form-item>
        <t-form-item label="创建时间" name="dateRange">
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
        <t-button
          v-hasPermi="['tool:gen:code']"
          :disabled="!selectedRows.length"
          theme="primary"
          variant="outline"
          @click="handleGenTable()"
          ><template #icon><download-icon /></template>生成</t-button
        >
        <t-button v-hasPermi="['tool:gen:import']" theme="primary" @click="openImport"
          ><template #icon><upload-icon /></template>导入</t-button
        >
        <t-button
          v-hasPermi="['tool:gen:edit']"
          :disabled="selectedRows.length !== 1"
          theme="success"
          variant="outline"
          @click="handleEdit(selectedRows[0])"
          ><template #icon><edit-icon /></template>修改</t-button
        >
        <t-popconfirm content="是否确认删除选中的表数据?" @confirm="handleDelete()">
          <t-button v-hasPermi="['tool:gen:remove']" :disabled="!selectedRows.length" theme="danger" variant="outline"
            ><template #icon><delete-icon /></template>删除</t-button
          >
        </t-popconfirm>
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="tool_gen_column_visible"
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
        row-key="tableId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #updateTime="{ row }">{{ parseTime(row.updateTime) }}</template>
        <template #operation="{ row }">
          <t-space :breakLine="false" size="small">
            <t-link v-hasPermi="['tool:gen:preview']" hover="color" theme="primary" @click="handlePreview(row)"
              >预览</t-link
            >
            <t-link v-hasPermi="['tool:gen:edit']" hover="color" theme="primary" @click="handleEdit(row)">编辑</t-link>
            <t-popconfirm :content="`确认要强制同步&quot;${row.tableName}&quot;表结构吗？`" @confirm="handleSync(row)">
              <t-link v-hasPermi="['tool:gen:edit']" hover="color" theme="primary">同步</t-link>
            </t-popconfirm>
            <t-link v-hasPermi="['tool:gen:code']" hover="color" theme="primary" @click="handleGenTable(row)"
              >生成代码</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['tool:gen:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 导入表 -->
    <t-dialog
      v-model:visible="importVisible"
      :confirm-btn="{ loading: importing }"
      :on-confirm="handleImport"
      header="导入表"
      width="780px"
    >
      <t-form :data="dbQuery" layout="inline" @submit="loadDbTables">
        <t-form-item label="表名称" name="tableName"
          ><t-input v-model="dbQuery.tableName" clearable placeholder="请输入表名称"
        /></t-form-item>
        <t-form-item label="表描述" name="tableComment"
          ><t-input v-model="dbQuery.tableComment" clearable placeholder="请输入表描述"
        /></t-form-item>
        <t-form-item><t-button theme="primary" type="submit">搜索</t-button></t-form-item>
      </t-form>
      <t-table
        :columns="dbColumns"
        :data="dbTables"
        :loading="dbLoading"
        :pagination="dbPagination"
        :selected-row-keys="dbSelectedKeys"
        hover
        max-height="420"
        row-key="tableName"
        stripe
        @select-change="onDbSelectChange"
        @page-change="onDbPageChange"
      />
    </t-dialog>

    <!-- 预览代码 -->
    <t-drawer v-model:visible="previewVisible" :footer="false" header="代码预览" size="60%">
      <t-tabs v-model="currentFile">
        <t-tab-panel v-for="f in fileOptions" :key="f.value" :label="f.label" :value="f.value">
          <div class="code-toolbar">
            <t-link hover="color" theme="primary" @click="copyCode(previewFiles[f.value])">
              <template #prefix-icon><file-copy-icon /></template>复制
            </t-link>
          </div>
          <pre class="code-block">{{ previewFiles[f.value] || '' }}</pre>
        </t-tab-panel>
      </t-tabs>
    </t-drawer>

    <!-- 配置编辑（3 栏：基本/字段/生成） -->
    <t-dialog
      v-model:visible="editVisible"
      :confirm-btn="{ loading: saving }"
      :on-confirm="handleSaveConfig"
      header="修改表配置"
      width="960px"
    >
      <t-tabs v-model="editTab">
        <!-- 基本信息 -->
        <t-tab-panel :destroy-on-hide="false" label="基本信息" value="basic">
          <t-form ref="basicFormRef" :data="editForm" :rules="basicRules" label-width="120px">
            <t-row>
              <t-col :span="6"
                ><t-form-item label="表名称" name="tableName"><t-input v-model="editForm.tableName" /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item label="表描述" name="tableComment"
                  ><t-input v-model="editForm.tableComment" /></t-form-item
              ></t-col>
            </t-row>
            <t-row>
              <t-col :span="6"
                ><t-form-item label="实体类名称" name="className"><t-input v-model="editForm.className" /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item label="作者" name="functionAuthor"
                  ><t-input v-model="editForm.functionAuthor" /></t-form-item
              ></t-col>
            </t-row>
            <t-form-item label="备注" name="remark"
              ><t-textarea v-model="editForm.remark" :autosize="{ minRows: 2 }"
            /></t-form-item>
          </t-form>
        </t-tab-panel>

        <!-- 字段信息 -->
        <t-tab-panel :destroy-on-hide="false" label="字段信息" value="columns">
          <t-table :columns="colColumns" :data="editColumns" bordered max-height="460" row-key="columnId" size="small">
            <template #index="{ rowIndex }">{{ rowIndex + 1 }}</template>
            <template #columnComment="{ row }"><t-input v-model="row.columnComment" size="small" /></template>
            <template #javaField="{ row }"><t-input v-model="row.javaField" size="small" /></template>
            <template #isInsert="{ row }"
              ><t-checkbox :checked="row.isInsert === '1'" @change="(v: boolean) => (row.isInsert = v ? '1' : '0')"
            /></template>
            <template #isEdit="{ row }"
              ><t-checkbox :checked="row.isEdit === '1'" @change="(v: boolean) => (row.isEdit = v ? '1' : '0')"
            /></template>
            <template #isList="{ row }"
              ><t-checkbox :checked="row.isList === '1'" @change="(v: boolean) => (row.isList = v ? '1' : '0')"
            /></template>
            <template #isQuery="{ row }"
              ><t-checkbox :checked="row.isQuery === '1'" @change="(v: boolean) => (row.isQuery = v ? '1' : '0')"
            /></template>
            <template #isRequired="{ row }"
              ><t-checkbox :checked="row.isRequired === '1'" @change="(v: boolean) => (row.isRequired = v ? '1' : '0')"
            /></template>
            <template #javaType="{ row }">
              <t-select v-model="row.javaType" :options="javaTypeOptions" size="small" />
            </template>
            <template #htmlType="{ row }">
              <t-select
                v-model="row.htmlType"
                :options="htmlTypeOptions"
                size="small"
                @change="normalizeColumnDictType(row)"
              />
            </template>
            <template #queryType="{ row }">
              <t-select v-model="row.queryType" :options="queryTypeOptions" size="small" />
            </template>
            <template #dictType="{ row }">
              <t-select
                v-model="row.dictType"
                :disabled="!supportsDictHtmlType(row.htmlType)"
                :options="dictOptions"
                clearable
                filterable
                placeholder="请选择"
                size="small"
              />
            </template>
          </t-table>
        </t-tab-panel>

        <!-- 生成信息 -->
        <t-tab-panel :destroy-on-hide="false" label="生成信息" value="gen">
          <t-form ref="genFormRef" :data="editForm" :rules="genRules" label-width="120px">
            <t-row>
              <t-col :span="6"
                ><t-form-item label="生成模板" name="tplCategory"
                  ><t-select v-model="editForm.tplCategory" :options="tplOptions" /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item label="前端模板" name="frontendType"
                  ><t-radio-group v-model="editForm.frontendType" :options="frontendOptions" /></t-form-item
              ></t-col>
            </t-row>
            <t-row>
              <t-col :span="6"
                ><t-form-item help="生成在哪个 java 包下，例如 com.ruoyi.system" label="生成包路径" name="packageName"
                  ><t-input v-model="editForm.packageName" /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item help="可理解为子系统名，例如 system" label="生成模块名" name="moduleName"
                  ><t-input v-model="editForm.moduleName" /></t-form-item
              ></t-col>
            </t-row>
            <t-row>
              <t-col :span="6"
                ><t-form-item help="可理解为功能英文名，例如 user" label="生成业务名" name="businessName"
                  ><t-input v-model="editForm.businessName" /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item help="用作类描述，例如 用户" label="生成功能名" name="functionName"
                  ><t-input v-model="editForm.functionName" /></t-form-item
              ></t-col>
            </t-row>
            <t-row>
              <t-col :span="3"
                ><t-form-item label="导出能力"><t-switch v-model="editForm.enableExport" /></t-form-item
              ></t-col>
              <t-col :span="3"
                ><t-form-item label="状态切换"><t-switch v-model="editForm.enableStatus" /></t-form-item
              ></t-col>
              <t-col :span="3"
                ><t-form-item label="排序调整"><t-switch v-model="editForm.enableSort" /></t-form-item
              ></t-col>
              <t-col :span="3"
                ><t-form-item label="组合唯一"><t-switch v-model="editForm.enableUnique" /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.enableStatus">
              <t-col :span="12"
                ><t-form-item label="状态字段" name="statusField"
                  ><t-select
                    v-model="editForm.statusField"
                    :options="columnOptions"
                    clearable
                    filterable /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.enableSort">
              <t-col :span="12"
                ><t-form-item label="排序字段" name="sortField"
                  ><t-select
                    v-model="editForm.sortField"
                    :options="sortableColumnOptions"
                    clearable
                    filterable /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.enableUnique">
              <t-col :span="12"
                ><t-form-item label="唯一字段" name="uniqueFields"
                  ><t-select
                    v-model="editForm.uniqueFields"
                    :options="columnOptions"
                    clearable
                    filterable
                    multiple /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.tplCategory === 'tree'">
              <t-col :span="6"
                ><t-form-item label="树编码字段"
                  ><t-select v-model="editForm.treeCode" :options="columnOptions" clearable filterable /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item label="树父编码"
                  ><t-select
                    v-model="editForm.treeParentCode"
                    :options="columnOptions"
                    clearable
                    filterable /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.tplCategory === 'tree'">
              <t-col :span="6"
                ><t-form-item label="树名称字段"
                  ><t-select v-model="editForm.treeName" :options="columnOptions" clearable filterable /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item label="根节点值" name="treeRootValue"
                  ><t-input v-model="editForm.treeRootValue" placeholder="如 0" /></t-form-item
              ></t-col>
            </t-row>
            <t-row v-if="editForm.tplCategory === 'tree'">
              <t-col :span="6"
                ><t-form-item label="祖级字段"
                  ><t-select
                    v-model="editForm.treeAncestorsField"
                    :options="columnOptions"
                    clearable
                    filterable /></t-form-item
              ></t-col>
              <t-col :span="6"
                ><t-form-item label="树排序字段"
                  ><t-select
                    v-model="editForm.treeOrderField"
                    :options="sortableColumnOptions"
                    clearable
                    filterable /></t-form-item
              ></t-col>
            </t-row>
            <t-form-item help="分配到指定菜单下，例如 系统管理" label="上级菜单"
              ><t-tree-select
                v-model="editForm.parentMenuId"
                :data="menuTreeOptions"
                :keys="{ label: 'label', value: 'value', children: 'children' }"
                clearable
                filterable
                placeholder="选择上级菜单"
            /></t-form-item>
          </t-form>
        </t-tab-panel>
      </t-tabs>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import {
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  FileCopyIcon,
  RefreshIcon,
  SearchIcon,
  UploadIcon,
} from 'tdesign-icons-vue-next';
import { useClipboard } from '@vueuse/core';
import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import type { DbTableVO, PreviewResult, TableQuery, TableVO } from '@/api/tool/gen/types';
import {
  delTable,
  getDataNames,
  getGenTable,
  importTable,
  listDbTable,
  listTable,
  previewTable,
  synchDb,
  updateGenTable,
} from '@/api/tool/gen';
import { optionselect as getDictOptionselect } from '@/api/system/dict/type';
import { treeselect as menuTreeselect } from '@/api/system/menu';
import { useDateRangeQuery } from '@/hooks/useDateRangeQuery';
import { downloadZip } from '@/utils/request';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'ToolGen' });
const { dateRange, applyDateRange, resetDateRange } = useDateRangeQuery();
const route = useRoute();

const list = ref<TableVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<TableVO[]>([]);
const dataNames = ref<string[]>([]);
const showSearch = ref(true);

const queryParams = reactive<TableQuery>({ pageNum: 1, pageSize: 10, tableName: '', tableComment: '', dataName: '' });
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'dataName', title: '数据源', width: 120, ellipsis: true },
  { colKey: 'tableName', title: '表名称', width: 200, ellipsis: true },
  { colKey: 'tableComment', title: '表描述', width: 200, ellipsis: true },
  { colKey: 'className', title: '实体', width: 200, ellipsis: true },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'updateTime', title: '更新时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 300, fixed: 'right', align: 'center' },
];
const columns = ref<PrimaryTableCol[]>(columnsData);
const realColumns = computed<PrimaryTableCol[]>(() => {
  const all = columns.value as any[];
  return all.filter((c: any) => c.visible !== false) as unknown as PrimaryTableCol[];
});

const getList = async () => {
  loading.value = true;
  try {
    const res = await listTable(applyDateRange(queryParams));
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
  queryParams.tableName = '';
  queryParams.tableComment = '';
  queryParams.dataName = '';
  resetDateRange();
  handleQuery();
};

const loadDataNames = async () => {
  try {
    const res = await getDataNames();
    dataNames.value = (res?.data ?? []) as string[];
  } catch {
    /* ignore */
  }
};

// ---- 预览 ----
const previewVisible = ref(false);
const previewFiles = ref<PreviewResult>({});
const currentFile = ref('');
const fileOptions = ref<{ label: string; value: string }[]>([]);
const handlePreview = async (row: TableVO) => {
  const res = await previewTable(row.tableId);
  const data = (res?.data ?? {}) as PreviewResult;
  previewFiles.value = data;
  const keys = Object.keys(data);
  // 模板路径如 vm/java/domain.java.vm → 显示 domain.java
  fileOptions.value = keys.map((k) => ({ label: k.substring(k.lastIndexOf('/') + 1).replace(/\.vm$/, ''), value: k }));
  currentFile.value = keys[0] ?? '';
  previewVisible.value = true;
};
const { copy } = useClipboard({ legacy: true });
const copyCode = async (text?: string) => {
  await copy(text ?? '');
  MessagePlugin.success('复制成功');
};

// ---- 生成 / 同步 / 删除 ----
/** 生成代码：单行或批量，均走 batchGenCode?tableIdStr= 下载 zip（同原项目） */
const handleGenTable = (row?: TableVO) => {
  const rows = row ? [row] : selectedRows.value;
  if (!rows.length) {
    MessagePlugin.error('请选择要生成的数据');
    return;
  }
  const ids = rows.map((r) => r.tableId).join(',');
  downloadZip(`/tool/gen/batchGenCode?tableIdStr=${ids}`, 'ruoyi.zip');
};
const handleSync = async (row: TableVO) => {
  await synchDb(row.tableId);
  MessagePlugin.success('同步成功');
  getList();
};
const handleDelete = async (row?: TableVO) => {
  const ids = row ? [row.tableId] : selectedRows.value.map((r) => r.tableId);
  if (!ids.length) return;
  await delTable(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

// ---- 导入表 ----
const importVisible = ref(false);
const importing = ref(false);
const dbTables = ref<DbTableVO[]>([]);
const dbLoading = ref(false);
const dbSelectedKeys = ref<(string | number)[]>([]);
const dbSelectedRows = ref<DbTableVO[]>([]);
const dbQuery = reactive<TableQuery>({ pageNum: 1, pageSize: 10, tableName: '', tableComment: '', dataName: '' });
const dbPagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });
const dbColumns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'tableName', title: '表名称', width: 240 },
  { colKey: 'tableComment', title: '表描述', width: 240 },
  { colKey: 'createTime', title: '创建时间', width: 180 },
];

const openImport = () => {
  dbQuery.tableName = '';
  dbQuery.tableComment = '';
  dbQuery.dataName = queryParams.dataName ?? '';
  dbQuery.pageNum = 1;
  dbSelectedKeys.value = [];
  dbSelectedRows.value = [];
  importVisible.value = true;
  loadDbTables();
};
const loadDbTables = async () => {
  dbLoading.value = true;
  try {
    const res = await listDbTable(dbQuery);
    const data = res?.data;
    dbTables.value = data?.rows ?? [];
    dbPagination.total = data?.total ?? 0;
    dbPagination.current = dbQuery.pageNum;
    dbPagination.pageSize = dbQuery.pageSize;
  } finally {
    dbLoading.value = false;
  }
};
const onDbSelectChange = (keys: (string | number)[], options: any) => {
  dbSelectedKeys.value = keys;
  dbSelectedRows.value = options?.selectedRowData ?? [];
};
const onDbPageChange = (p: PageInfo) => {
  dbQuery.pageNum = p.current;
  dbQuery.pageSize = p.pageSize;
  loadDbTables();
};
const handleImport = async () => {
  const tables = dbSelectedRows.value.map((r) => r.tableName).join(',');
  if (!tables) {
    MessagePlugin.warning('请选择要导入的表');
    return;
  }
  importing.value = true;
  try {
    await importTable({ tables, dataName: dbQuery.dataName ?? '' });
    MessagePlugin.success('导入成功');
    importVisible.value = false;
    getList();
  } finally {
    importing.value = false;
  }
};

// ---- 配置编辑 ----
const editVisible = ref(false);
const saving = ref(false);
const editForm = reactive<any>({});
const editTab = ref('basic');
const editColumns = ref<any[]>([]);
const dictOptions = ref<{ label: string; value: string }[]>([]);
const basicFormRef = ref<FormInstanceFunctions>();
const genFormRef = ref<FormInstanceFunctions>();

const DICT_HTML_TYPES = ['select', 'radio', 'checkbox', 'switch'];
const supportsDictHtmlType = (htmlType?: string) => DICT_HTML_TYPES.includes(htmlType ?? '');
const normalizeColumnDictType = (column: any) => {
  if (!supportsDictHtmlType(column.htmlType)) column.dictType = '';
};

// 列字段下拉选项（用于状态/排序/唯一/树字段选择）
const columnOptions = computed(() =>
  editColumns.value.map((c: any) => ({
    label: `${c.columnName}${c.columnComment ? ': ' + c.columnComment : ''}`,
    value: c.columnName,
  })),
);
const sortableColumnOptions = computed(() =>
  editColumns.value
    .filter((c: any) => ['Integer', 'Long', 'Double', 'BigDecimal', 'LocalDateTime'].includes(c.javaType ?? ''))
    .map((c: any) => ({
      label: `${c.columnName}${c.columnComment ? ': ' + c.columnComment : ''}`,
      value: c.columnName,
    })),
);

// 父菜单树选项
const menuTreeOptions = ref<any[]>([]);
const toMenuTree = (nodes: any[]): any[] =>
  (nodes || []).map((n) => ({
    label: n.label,
    value: n.id,
    children: n.children?.length ? toMenuTree(n.children) : undefined,
  }));

const colColumns: PrimaryTableCol[] = [
  { colKey: 'index', title: '序号', width: 60, align: 'center' },
  { colKey: 'columnName', title: '字段列名', width: 160, ellipsis: true },
  { colKey: 'columnComment', title: '字段描述', width: 160 },
  { colKey: 'columnType', title: '物理类型', width: 130, ellipsis: true },
  { colKey: 'javaType', title: 'Java类型', width: 150 },
  { colKey: 'javaField', title: 'Java属性', width: 130 },
  { colKey: 'isInsert', title: '插入', width: 60, align: 'center' },
  { colKey: 'isEdit', title: '编辑', width: 60, align: 'center' },
  { colKey: 'isList', title: '列表', width: 60, align: 'center' },
  { colKey: 'isQuery', title: '查询', width: 60, align: 'center' },
  { colKey: 'isRequired', title: '必填', width: 60, align: 'center' },
  { colKey: 'queryType', title: '查询方式', width: 130 },
  { colKey: 'htmlType', title: '显示类型', width: 130 },
  { colKey: 'dictType', title: '字典类型', width: 160 },
];

const javaTypeOptions = [
  { label: 'Long', value: 'Long' },
  { label: 'String', value: 'String' },
  { label: 'Integer', value: 'Integer' },
  { label: 'Double', value: 'Double' },
  { label: 'BigDecimal', value: 'BigDecimal' },
  { label: 'LocalDateTime', value: 'LocalDateTime' },
  { label: 'Boolean', value: 'Boolean' },
];
const htmlTypeOptions = [
  { label: '文本框', value: 'input' },
  { label: '数字输入', value: 'inputNumber' },
  { label: '文本域', value: 'textarea' },
  { label: '下拉框', value: 'select' },
  { label: '单选框', value: 'radio' },
  { label: '复选框', value: 'checkbox' },
  { label: '开关', value: 'switch' },
  { label: '日期控件', value: 'datetime' },
  { label: '图片上传', value: 'imageUpload' },
  { label: '文件上传', value: 'fileUpload' },
  { label: '富文本控件', value: 'editor' },
];
const queryTypeOptions = [
  { label: '=', value: 'EQ' },
  { label: '!=', value: 'NE' },
  { label: '>', value: 'GT' },
  { label: '>=', value: 'GE' },
  { label: '<', value: 'LT' },
  { label: '<=', value: 'LE' },
  { label: 'LIKE', value: 'LIKE' },
  { label: 'BETWEEN', value: 'BETWEEN' },
];
const tplOptions = [
  { label: '单表（增删改查）', value: 'crud' },
  { label: '树表（增删改查）', value: 'tree' },
];
const frontendOptions = [
  { label: 'Vue', value: 'vue' },
  { label: 'React', value: 'react' },
];

const basicRules: Record<string, FormRule[]> = {
  tableName: [{ required: true, message: '表名称不能为空', type: 'error' }],
  tableComment: [{ required: true, message: '表描述不能为空', type: 'error' }],
  className: [{ required: true, message: '实体类名称不能为空', type: 'error' }],
  functionAuthor: [{ required: true, message: '作者不能为空', type: 'error' }],
};
const genRules: Record<string, FormRule[]> = {
  tplCategory: [{ required: true, message: '请选择生成模板', type: 'error' }],
  packageName: [{ required: true, message: '请输入生成包路径', type: 'error' }],
  moduleName: [{ required: true, message: '请输入生成模块名', type: 'error' }],
  businessName: [{ required: true, message: '请输入生成业务名', type: 'error' }],
  functionName: [{ required: true, message: '请输入生成功能名', type: 'error' }],
};

const handleEdit = async (row: TableVO) => {
  editTab.value = 'basic';
  const res = await getGenTable(row.tableId);
  const data = res?.data as any;
  // 后端返回 { info: GenTable, rows: GenTableColumn[] }
  const t = data?.info ?? data?.table ?? row;
  Object.assign(editForm, {
    tableId: t.tableId,
    dataName: t.dataName,
    tableName: t.tableName,
    tableComment: t.tableComment,
    className: t.className,
    functionAuthor: t.functionAuthor,
    packageName: t.packageName,
    moduleName: t.moduleName,
    businessName: t.businessName,
    functionName: t.functionName,
    tplCategory: t.tplCategory ?? 'crud',
    frontendType: t.frontendType ?? 'vue',
    // 增强选项直接来自 GenTable 顶层字段（backend 在 setTableFromOptions 中从 options JSON 解出后赋值）
    enableExport: t.enableExport !== false && t.enableExport !== null ? (t.enableExport ?? true) : false,
    enableStatus: !!t.enableStatus,
    statusField: t.statusField ?? '',
    enableUnique: !!t.enableUnique,
    uniqueFields: t.uniqueFields ?? [],
    enableSort: !!t.enableSort,
    sortField: t.sortField ?? '',
    treeCode: t.treeCode ?? '',
    treeParentCode: t.treeParentCode ?? '',
    treeName: t.treeName ?? '',
    treeRootValue: t.treeRootValue ?? '0',
    treeAncestorsField: t.treeAncestorsField ?? '',
    treeOrderField: t.treeOrderField ?? '',
    parentMenuId: t.parentMenuId ?? 0,
    remark: t.remark ?? '',
  });
  // 字段信息
  editColumns.value = (data?.rows ?? []).map((c: any) => {
    const col = { ...c };
    if (!supportsDictHtmlType(String(col.htmlType ?? ''))) col.dictType = '';
    return col;
  });
  // 父菜单树
  try {
    const mres = await menuTreeselect();
    menuTreeOptions.value = [{ label: '主类目', value: 0 }, ...toMenuTree(mres?.data ?? [])];
  } catch {
    menuTreeOptions.value = [{ label: '主类目', value: 0 }];
  }
  // 字典类型下拉
  try {
    const dres = await getDictOptionselect();
    dictOptions.value = (dres?.data ?? []).map((d: any) => ({ label: d.dictName, value: d.dictType }));
  } catch {
    dictOptions.value = [];
  }
  editVisible.value = true;
};

const handleSaveConfig = async () => {
  const basicOk = (await basicFormRef.value?.validate()) === true;
  const genOk = (await genFormRef.value?.validate()) === true;
  if (!basicOk || !genOk) {
    MessagePlugin.error('表单校验未通过，请重新检查提交内容');
    return;
  }
  saving.value = true;
  try {
    // 将增强选项组装进 params（后端 updateGenTable 会将 params 序列化为 options JSON）
    const payload = {
      ...editForm,
      columns: editColumns.value,
      params: {
        treeCode: editForm.treeCode,
        treeName: editForm.treeName,
        treeParentCode: editForm.treeParentCode,
        parentMenuId: editForm.parentMenuId,
        enableExport: editForm.enableExport,
        enableStatus: editForm.enableStatus,
        statusField: editForm.statusField,
        enableUnique: editForm.enableUnique,
        uniqueFields: editForm.uniqueFields,
        enableSort: editForm.enableSort,
        sortField: editForm.sortField,
        treeRootValue: editForm.treeRootValue,
        treeAncestors: editForm.treeAncestorsField,
        treeOrderField: editForm.treeOrderField,
      },
    };
    await updateGenTable(payload);
    MessagePlugin.success('保存成功');
    editVisible.value = false;
    getList();
  } finally {
    saving.value = false;
  }
};

loadDataNames();
getList();
</script>

<style lang="less" scoped>
.gen-page {
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
.preview-body {
  height: 100%;
}
.code-block {
  margin: 0;
  padding: 12px;
  background: var(--td-bg-color-secondarycontainer);
  border-radius: var(--td-radius-default);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: calc(100vh - 220px);
  overflow: auto;
}
</style>
