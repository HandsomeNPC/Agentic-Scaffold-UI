<template>
  <div class="dept-page">
    <t-card :bordered="false">
      <template #title>
        <div class="card-title">部门管理</div>
      </template>

      <!-- 搜索 -->
      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="部门名称" name="deptName">
          <t-input v-model="queryParams.deptName" clearable placeholder="请输入部门名称" />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <dict-select
            v-model="queryParams.status"
            placeholder="部门状态"
            style="width: 180px"
            type="sys_normal_disable"
          />
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
        <t-button v-hasPermi="['system:dept:add']" theme="primary" @click="handleAdd()">
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
          storage-key="sys_dept_column_visible"
          @query-table="getList"
        />
      </div>

      <!-- 树表 -->
      <t-enhanced-table
        ref="tableRef"
        :columns="realColumns"
        :data="deptList"
        :loading="loading"
        :tree="{ childrenKey: 'children', defaultExpandAll: true }"
        hover
        row-key="deptId"
      >
        <template #status="{ row }">
          <dict-tag :options="sys_normal_disable" :value="row.status" />
        </template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['system:dept:add']" hover="color" theme="primary" @click="handleAdd(row)">新增</t-link>
            <t-link v-hasPermi="['system:dept:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除该部门?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:dept:remove']" hover="color" theme="danger">删除</t-link>
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
      width="600px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="90px" @submit="onSubmit">
        <t-form-item v-if="!form.parentId || true" label="上级部门" name="parentId">
          <t-tree-select
            v-model="form.parentId"
            :data="parentOptions"
            :keys="{ label: 'label', value: 'value', children: 'children' }"
            clearable
            filterable
            placeholder="请选择上级部门"
            @change="onParentChange"
          />
        </t-form-item>
        <t-row>
          <t-col :span="6">
            <t-form-item label="部门名称" name="deptName">
              <t-input v-model="form.deptName" placeholder="请输入部门名称" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="类别编码" name="deptCategory">
              <t-input v-model="form.deptCategory" placeholder="请输入类别编码" />
            </t-form-item>
          </t-col>
        </t-row>
        <t-row>
          <t-col :span="6">
            <t-form-item label="显示排序" name="orderNum">
              <t-input-number v-model="form.orderNum" :min="0" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="负责人" name="leader">
              <t-select
                v-model="form.leader"
                :options="deptUserOptions"
                clearable
                filterable
                placeholder="请选择负责人"
              />
            </t-form-item>
          </t-col>
        </t-row>
        <t-row>
          <t-col :span="6">
            <t-form-item label="联系电话" name="phone">
              <t-input v-model="form.phone" placeholder="请输入联系电话" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="邮箱" name="email">
              <t-input v-model="form.email" placeholder="请输入邮箱" />
            </t-form-item>
          </t-col>
        </t-row>
        <t-row>
          <t-col :span="6">
            <t-form-item label="部门状态" name="status">
              <dict-select v-model="form.status" placeholder="请选择" type="sys_normal_disable" />
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

import type { DeptForm, DeptQuery, DeptVO } from '@/api/system/dept/types';
import { addDept, delDept, listDept, listDeptExcludeChild, updateDept } from '@/api/system/dept';
import { listUserByDeptId } from '@/api/system/user';
import { useDict } from '@/utils/dict';
import { handleTree, parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemDept' });

const { sys_normal_disable } = useDict('sys_normal_disable');

const deptList = ref<DeptVO[]>([]);
const loading = ref(false);
const isExpandAll = ref(true);
const tableRef = ref();
const showSearch = ref(true);

// 负责人下拉：来自所选上级部门下的用户列表（后端 SysDeptBo.leader 是 Long）
const deptUserOptions = ref<{ label: string; value: string | number }[]>([]);
const loadDeptUsers = async (deptId?: string | number) => {
  if (deptId === undefined || deptId === null || deptId === '') {
    deptUserOptions.value = [];
    return;
  }
  try {
    const res = await listUserByDeptId(deptId);
    const list = (res?.data ?? []) as any[];
    deptUserOptions.value = list.map((u) => ({
      label: u.nickName ? `${u.nickName}(${u.userName})` : u.userName,
      value: u.userId,
    }));
  } catch {
    deptUserOptions.value = [];
  }
};
const onParentChange = (val: any) => {
  form.leader = undefined;
  loadDeptUsers(val);
};

const queryParams = reactive<DeptQuery>({
  pageNum: 1,
  pageSize: 10,
  deptName: '',
  status: '',
});

const columnsData: PrimaryTableCol[] = [
  { colKey: 'deptName', title: '部门名称', width: 200 },
  { colKey: 'deptCategory', title: '类别编码', width: 160, align: 'center' },
  { colKey: 'orderNum', title: '排序', width: 100, align: 'center' },
  { colKey: 'leaderName', title: '负责人', width: 120 },
  { colKey: 'phone', title: '联系电话', width: 140 },
  { colKey: 'email', title: '邮箱', width: 200, ellipsis: true },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
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
    const res = await listDept(queryParams);
    const data = Array.isArray(res?.data) ? res.data : [];
    deptList.value = handleTree<DeptVO>(data, 'deptId');
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => getList();
const resetQuery = () => {
  queryParams.deptName = '';
  queryParams.status = '';
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
const parentOptions = ref<any[]>([]);

const initForm = (): DeptForm => ({
  parentId: undefined,
  deptId: undefined,
  deptName: '',
  deptCategory: '',
  orderNum: 0,
  leader: '',
  phone: '',
  email: '',
  status: '0',
});

const form = reactive<DeptForm>(initForm());

const rules: Record<string, FormRule[]> = {
  parentId: [{ required: true, message: '请选择上级部门', type: 'error' }],
  deptName: [{ required: true, message: '请输入部门名称', type: 'error' }],
  orderNum: [{ required: true, message: '请输入显示排序', type: 'error' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', type: 'warning' }],
  email: [{ email: true, message: '请输入正确的邮箱地址', type: 'warning' }],
};

/** DeptVO 树 → t-tree-select 数据 */
const toTreeSelect = (list: DeptVO[]): any[] => {
  return list.map((d) => ({
    label: d.deptName,
    value: d.deptId,
    children: d.children?.length ? toTreeSelect(d.children) : undefined,
  }));
};

const loadParentOptions = async (excludeId?: string | number) => {
  const res = excludeId ? await listDeptExcludeChild(excludeId) : await listDept();
  const data = Array.isArray(res?.data) ? res.data : [];
  parentOptions.value = toTreeSelect(handleTree<DeptVO>(data, 'deptId'));
};

const handleAdd = async (row?: DeptVO) => {
  Object.assign(form, initForm());
  if (row) form.parentId = row.deptId;
  await loadParentOptions();
  await loadDeptUsers(form.parentId);
  dialogTitle.value = '新增部门';
  dialogVisible.value = true;
};

const handleUpdate = async (row: DeptVO) => {
  Object.assign(form, initForm());
  Object.assign(form, {
    parentId: row.parentId,
    deptId: row.deptId,
    deptName: row.deptName,
    deptCategory: row.deptCategory,
    orderNum: row.orderNum,
    leader: row.leader,
    phone: row.phone,
    email: row.email,
    status: row.status,
  });
  await loadParentOptions(row.deptId);
  // 负责人候选 = 当前部门下的用户（与原项目一致）
  await loadDeptUsers(row.deptId);
  dialogTitle.value = '修改部门';
  dialogVisible.value = true;
};

const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.deptId) {
      await updateDept(form);
      MessagePlugin.success('修改成功');
    } else {
      await addDept(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (row: DeptVO) => {
  await delDept(row.deptId);
  MessagePlugin.success('删除成功');
  getList();
};

getList();
</script>

<style lang="less" scoped>
.dept-page {
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
