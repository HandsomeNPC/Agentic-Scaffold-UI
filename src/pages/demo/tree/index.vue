<template>
  <div class="demo-tree-page">
    <t-card :bordered="false">
      <template #title>
        <div class="card-title">测试树表</div>
      </template>

      <!-- 搜索 -->
      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="树节点名" name="treeName">
          <t-input v-model="queryParams.treeName" clearable placeholder="请输入树节点名" />
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
        <t-button v-hasPermi="['demo:tree:add']" theme="primary" @click="handleAdd()">
          <template #icon><add-icon /></template>
          新增
        </t-button>
        <t-button theme="default" variant="outline" @click="toggleExpand">
          <template #icon><t-icon name="chevron-down" /></template>
          展开/折叠
        </t-button>
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="demo_tree_column_visible"
          @query-table="getList"
        />
      </div>

      <!-- 树表 -->
      <t-enhanced-table
        ref="tableRef"
        :columns="realColumns"
        :data="treeList"
        :loading="loading"
        :tree="{ childrenKey: 'children', defaultExpandAll: true }"
        hover
        row-key="id"
      >
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['demo:tree:add']" hover="color" theme="primary" @click="handleAdd(row)">新增</t-link>
            <t-link v-hasPermi="['demo:tree:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['demo:tree:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-enhanced-table>
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
        <t-form-item label="父节点" name="parentId">
          <t-tree-select
            v-model="form.parentId"
            :data="parentOptions"
            :keys="{ label: 'treeName', value: 'id', children: 'children' }"
            check-strictly
            clearable
            filterable
            placeholder="请选择父节点"
          />
        </t-form-item>
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
          <t-col :span="12">
            <t-form-item label="树节点名" name="treeName">
              <t-input v-model="form.treeName" placeholder="请输入树节点名" />
            </t-form-item>
          </t-col>
        </t-row>
      </t-form>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { TreeForm, TreeQuery, TreeVO } from '@/api/demo/tree/types';
import { addTree, delTree, getTree, listTree, updateTree } from '@/api/demo/tree';
import { handleTree } from '@/utils/ruoyi';

defineOptions({ name: 'DemoTree' });

const treeList = ref<TreeVO[]>([]);
const loading = ref(false);
const isExpandAll = ref(true);
const tableRef = ref();
const showSearch = ref(true);

const queryParams = reactive<TreeQuery>({
  treeName: '',
});

const columnsData: PrimaryTableCol[] = [
  { colKey: 'parentId', title: '父id', width: 120, align: 'center' },
  { colKey: 'deptId', title: '部门id', width: 120, align: 'center' },
  { colKey: 'userId', title: '用户id', width: 120, align: 'center' },
  { colKey: 'treeName', title: '树节点名' },
  { colKey: 'operation', title: '操作', width: 200, fixed: 'right', align: 'center' },
];
const columns = ref<PrimaryTableCol[]>(columnsData);
const realColumns = computed<PrimaryTableCol[]>(() => {
  const all = columns.value as any[];
  return all.filter((c: any) => c.visible !== false) as unknown as PrimaryTableCol[];
});

const getList = async () => {
  loading.value = true;
  try {
    const res = await listTree(queryParams);
    const data = Array.isArray(res?.data) ? res.data : [];
    treeList.value = handleTree<TreeVO>(data, 'id', 'parentId');
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => getList();
const resetQuery = () => {
  queryParams.treeName = '';
  getList();
};

const toggleExpand = () => {
  isExpandAll.value = !isExpandAll.value;
  if (isExpandAll.value) {
    tableRef.value?.expandAll?.();
  } else {
    tableRef.value?.foldAll?.();
  }
};

// ---- 表单 ----
const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const parentOptions = ref<TreeVO[]>([]);

const initForm = (): TreeForm => ({
  id: undefined,
  parentId: 0,
  deptId: undefined,
  userId: undefined,
  treeName: '',
});
const form = reactive<TreeForm>(initForm());
const rules: Record<string, FormRule[]> = {
  treeName: [{ required: true, message: '请输入树节点名', type: 'error' }],
  orderNum: [{ required: true, message: '请输入显示排序', type: 'error' }],
};

/** 构造父节点下拉树：根「顶级」+ 后端扁平数据组装树 */
const loadParentOptions = async () => {
  const res = await listTree();
  const data = Array.isArray(res?.data) ? res.data : [];
  parentOptions.value = [
    {
      id: 0,
      parentId: 0,
      deptId: 0,
      userId: 0,
      treeName: '顶级',
      children: handleTree<TreeVO>(data, 'id', 'parentId'),
    },
  ];
};

const handleAdd = async (row?: TreeVO) => {
  Object.assign(form, initForm());
  if (row?.id) form.parentId = row.id;
  await loadParentOptions();
  dialogTitle.value = '新增测试树';
  dialogVisible.value = true;
};
const handleUpdate = async (row: TreeVO) => {
  if (row?.id === undefined) return;
  Object.assign(form, initForm());
  const res = await getTree(row.id);
  Object.assign(form, initForm(), res?.data ?? {});
  await loadParentOptions();
  dialogTitle.value = '修改测试树';
  dialogVisible.value = true;
};
const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.id) {
      await updateTree(form);
      MessagePlugin.success('修改成功');
    } else {
      await addTree(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};
const handleDelete = async (row: TreeVO) => {
  if (row?.id === undefined) return;
  await delTree(row.id);
  MessagePlugin.success('删除成功');
  getList();
};

getList();
</script>

<style lang="less" scoped>
.demo-tree-page {
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
