<template>
  <div class="role-page">
    <t-card :bordered="false">
      <template #title>
        <div class="card-title">角色管理</div>
      </template>

      <!-- 搜索 -->
      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="角色名称" name="roleName">
          <t-input v-model="queryParams.roleName" clearable placeholder="请输入角色名称" />
        </t-form-item>
        <t-form-item label="权限字符" name="roleKey">
          <t-input v-model="queryParams.roleKey" clearable placeholder="请输入权限字符" />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <dict-select
            v-model="queryParams.status"
            placeholder="角色状态"
            style="width: 160px"
            type="sys_normal_disable"
          />
        </t-form-item>
        <t-form-item label="创建时间" name="dateRange">
          <t-date-range-picker v-model="dateRange" clearable style="width: 280px" value-type="YYYY-MM-DD HH:mm:ss" />
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

      <div class="toolbar">
        <t-button v-hasPermi="['system:role:add']" theme="primary" @click="handleAdd">
          <template #icon><add-icon /></template>
          新增
        </t-button>
        <t-button
          v-hasPermi="['system:role:edit']"
          :disabled="single"
          theme="success"
          variant="outline"
          @click="handleUpdate()"
        >
          <template #icon><edit-icon /></template>
          修改
        </t-button>
        <t-popconfirm content="是否确认删除选中的角色?" @confirm="handleDelete()">
          <t-button v-hasPermi="['system:role:remove']" :disabled="multiple" theme="danger" variant="outline">
            <template #icon><delete-icon /></template>
            删除
          </t-button>
        </t-popconfirm>
        <t-button v-hasPermi="['system:role:export']" theme="warning" variant="outline" @click="handleExport">
          <template #icon><download-icon /></template>
          导出
        </t-button>
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="sys_role_column_visible"
          @query-table="getList"
        />
      </div>

      <t-table
        :columns="realColumns"
        :data="roleList"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedKeys"
        hover
        row-key="roleId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #status="{ row }">
          <t-switch
            :disabled="isSuperAdminRole(row.roleId)"
            :value="row.status === '0'"
            @change="(v: any) => handleStatusChange(row, v)"
          />
        </template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space v-if="!isSuperAdminRole(row.roleId)" size="small">
            <t-link v-hasPermi="['system:role:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改权限</t-link
            >
            <t-link v-hasPermi="['system:role:edit']" hover="color" theme="primary" @click="handleAuthUser(row)"
              >分配用户</t-link
            >
            <t-popconfirm content="是否确认删除该角色?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:role:remove']" hover="color" theme="danger">删除</t-link>
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
      width="780px"
    >
      <t-tabs v-model="activeTab">
        <t-tab-panel :destroy-on-hide="false" label="基础信息" value="base">
          <t-form ref="formRef" :data="form" :rules="rules" label-width="100px">
            <t-row>
              <t-col :span="6">
                <t-form-item label="角色名称" name="roleName">
                  <t-input v-model="form.roleName" placeholder="请输入角色名称" />
                </t-form-item>
              </t-col>
              <t-col :span="6">
                <t-form-item label="权限字符" name="roleKey">
                  <t-input v-model="form.roleKey" placeholder="如 admin" />
                </t-form-item>
              </t-col>
            </t-row>
            <t-row>
              <t-col :span="6">
                <t-form-item label="显示排序" name="roleSort">
                  <t-input-number v-model="form.roleSort" :min="0" />
                </t-form-item>
              </t-col>
              <t-col :span="6">
                <t-form-item label="角色状态" name="status">
                  <dict-select v-model="form.status" placeholder="请选择" type="sys_normal_disable" />
                </t-form-item>
              </t-col>
            </t-row>
            <t-form-item label="备注" name="remark">
              <t-textarea v-model="form.remark" :autosize="{ minRows: 2 }" placeholder="请输入备注" />
            </t-form-item>
          </t-form>
        </t-tab-panel>

        <t-tab-panel :destroy-on-hide="false" label="菜单权限" value="menu">
          <div class="tree-toolbar">
            <t-checkbox v-model="form.menuCheckStrictly">父子联动</t-checkbox>
            <t-space size="small">
              <t-button size="small" theme="primary" variant="text" @click="expandMenuAll(true)">展开全部</t-button>
              <t-button size="small" theme="primary" variant="text" @click="expandMenuAll(false)">折叠全部</t-button>
              <t-button size="small" theme="primary" variant="text" @click="checkMenuAll(true)">全选</t-button>
              <t-button size="small" theme="primary" variant="text" @click="checkMenuAll(false)">全不选</t-button>
            </t-space>
          </div>
          <div class="tree-wrap menu-perm-tree">
            <t-tree
              ref="menuTreeRef"
              v-model="menuChecked"
              :check-strictly="!form.menuCheckStrictly"
              :data="menuTreeDisplay"
              :keys="{ label: 'label', value: 'id', children: 'children' }"
              checkable
              expand-all
              hover
              value-mode="all"
            >
              <template #operations="{ data }">
                <div v-if="data.buttonPermissions?.length" class="node-buttons" @click.stop>
                  <t-checkbox
                    v-for="b in data.buttonPermissions"
                    :key="b.id"
                    :checked="buttonChecked.has(b.id)"
                    :disabled="b.disabled"
                    @change="(v: any) => onButtonToggle(b.id, v)"
                    @click.stop
                    >{{ b.label }}</t-checkbox
                  >
                </div>
              </template>
            </t-tree>
          </div>
        </t-tab-panel>

        <t-tab-panel :destroy-on-hide="false" label="数据权限" value="data">
          <t-form :data="form" label-width="100px">
            <t-form-item label="数据范围" name="dataScope">
              <t-select v-model="form.dataScope" :options="dataScopeOptions" />
            </t-form-item>
            <t-form-item v-show="form.dataScope === '2'" label="数据权限">
              <div class="tree-toolbar">
                <t-checkbox v-model="form.deptCheckStrictly">父子联动</t-checkbox>
                <t-space size="small">
                  <t-button size="small" theme="primary" variant="text" @click="expandDeptAll(true)">展开全部</t-button>
                  <t-button size="small" theme="primary" variant="text" @click="expandDeptAll(false)"
                    >折叠全部</t-button
                  >
                  <t-button size="small" theme="primary" variant="text" @click="checkDeptAll(true)">全选</t-button>
                  <t-button size="small" theme="primary" variant="text" @click="checkDeptAll(false)">全不选</t-button>
                </t-space>
              </div>
              <div class="tree-wrap">
                <t-tree
                  ref="deptTreeRef"
                  v-model="deptChecked"
                  :check-strictly="!form.deptCheckStrictly"
                  :data="deptTree"
                  :keys="{ label: 'label', value: 'id', children: 'children' }"
                  checkable
                  expand-all
                  hover
                  value-mode="all"
                />
              </div>
            </t-form-item>
          </t-form>
        </t-tab-panel>
      </t-tabs>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, DeleteIcon, DownloadIcon, EditIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { RoleForm, RoleQuery, RoleVO } from '@/api/system/role/types';
import {
  addRole,
  changeRoleStatus,
  delRole,
  deptTreeSelect,
  listRole,
  updateRole,
  updateRolePermission,
} from '@/api/system/role';
import type { MenuTreeOption } from '@/api/system/menu/types';
import { roleMenuTreeselect, treeselect as menuTreeselect } from '@/api/system/menu';
import type { DeptVO } from '@/api/system/dept/types';
import { listDept } from '@/api/system/dept';
import { MenuTypeEnum } from '@/enums';
import { isSuperAdminRole } from '@/constants';
import { download } from '@/utils/request';
import { useDict } from '@/utils/dict';
import { useDateRangeQuery } from '@/hooks/useDateRangeQuery';
import { handleTree, parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemRole' });

const router = useRouter();

const { sys_normal_disable } = useDict('sys_normal_disable');
const { dateRange, applyDateRange, resetDateRange } = useDateRangeQuery();

const roleList = ref<RoleVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<RoleVO[]>([]);

const queryParams = reactive<RoleQuery>({
  pageNum: 1,
  pageSize: 10,
  roleName: '',
  roleKey: '',
  status: '',
});

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
});

const single = computed(() => selectedRows.value.length !== 1);
const multiple = computed(() => selectedRows.value.length === 0);
const showSearch = ref(true);

const columnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'roleId', title: '角色编号', width: 100, align: 'center' },
  { colKey: 'roleName', title: '角色名称', width: 160 },
  { colKey: 'roleKey', title: '权限字符', width: 200, ellipsis: true },
  { colKey: 'roleSort', title: '显示顺序', width: 100, align: 'center' },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 240, fixed: 'right', align: 'center' },
];
const columns = ref<PrimaryTableCol[]>(columnsData);
const realColumns = computed<PrimaryTableCol[]>(() => {
  const all = columns.value as any[];
  return all.filter((c: any) => c.visible !== false) as unknown as PrimaryTableCol[];
});

const getList = async () => {
  loading.value = true;
  try {
    const res = await listRole(applyDateRange(queryParams));
    const data = res?.data;
    roleList.value = data?.rows ?? [];
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

const onPageChange = (pageInfo: PageInfo) => {
  queryParams.pageNum = pageInfo.current;
  queryParams.pageSize = pageInfo.pageSize;
  getList();
};

const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};

const resetQuery = () => {
  queryParams.roleName = '';
  queryParams.roleKey = '';
  queryParams.status = '';
  resetDateRange();
  handleQuery();
};

const handleStatusChange = (row: RoleVO, v: any) => {
  const status = v ? '0' : '1';
  const text = v ? '启用' : '停用';
  const dialog = DialogPlugin.confirm({
    header: '系统提示',
    body: `确认要"${text}""${row.roleName}"角色吗?`,
    onConfirm: async () => {
      dialog.destroy();
      await changeRoleStatus(row.roleId, status);
      row.status = status;
      MessagePlugin.success(`${text}成功`);
    },
    onClose: () => dialog.destroy(),
  });
};

// ---- 表单 ----
const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const activeTab = ref('base');

const menuTreeRef = ref();
const deptTreeRef = ref();

const menuTreeDisplay = ref<DisplayMenuNode[]>([]);
const menuChecked = ref<Array<string | number>>([]);
// 按钮权限（F 型菜单）：独立勾选，不进 t-tree
const buttonChecked = reactive(new Set<string | number>());
const buttonPermIds = ref<Set<string | number>>(new Set());
const parentMap = ref<Map<string | number, string | number>>(new Map());
const buttonOwner = ref<Map<string | number, string | number>>(new Map());
const deptTree = ref<any[]>([]);
const deptChecked = ref<Array<string | number>>([]);

interface ButtonPerm {
  id: string | number;
  label: string;
  disabled?: boolean;
}
interface DisplayMenuNode {
  id: string | number;
  label: string;
  disabled?: boolean;
  children?: DisplayMenuNode[];
  buttonPermissions?: ButtonPerm[];
}

// 将后端菜单树（含 F 型按钮节点）重排：F 型剥离为父节点的 buttonPermissions
const buildDisplay = (raw: MenuTreeOption[]): { tree: DisplayMenuNode[]; buttonIds: Set<string | number> } => {
  const buttonIds = new Set<string | number>();
  const pMap = new Map<string | number, string | number>();
  const bOwner = new Map<string | number, string | number>();
  const walk = (nodes: MenuTreeOption[], parentId?: string | number): DisplayMenuNode[] =>
    nodes
      .filter((n) => n.menuType !== MenuTypeEnum.F)
      .map((n) => {
        const buttons: ButtonPerm[] = [];
        const menuChildren: MenuTreeOption[] = [];
        (n.children ?? []).forEach((c) => {
          if (c.menuType === MenuTypeEnum.F) {
            buttonIds.add(c.id);
            bOwner.set(c.id, n.id);
            buttons.push({ id: c.id, label: c.label, disabled: c.disabled });
          } else {
            menuChildren.push(c);
          }
        });
        if (parentId !== undefined) pMap.set(n.id, parentId);
        return {
          id: n.id,
          label: n.label,
          disabled: n.disabled,
          children: menuChildren.length ? walk(menuChildren, n.id) : undefined,
          buttonPermissions: buttons.length ? buttons : undefined,
        };
      });
  const tree = walk(raw);
  parentMap.value = pMap;
  buttonOwner.value = bOwner;
  return { tree, buttonIds };
};

// 按钮勾选时，父子联动开启则一并把所属菜单及其祖先链纳入提交集合（仅数据层，不动树 UI）
const onButtonToggle = (id: string | number, checked: any) => {
  if (checked) buttonChecked.add(id);
  else buttonChecked.delete(id);
};

// 收集某按钮所属菜单向上的整条菜单链 id
const collectOwnerChain = (buttonId: string | number): Array<string | number> => {
  const res: Array<string | number> = [];
  let cur = buttonOwner.value.get(buttonId);
  while (cur !== undefined) {
    res.push(cur);
    cur = parentMap.value.get(cur);
  }
  return res;
};

// 收集某节点的祖先链（不含自身）
const collectAncestors = (id: string | number, pMap: Map<string | number, string | number>) => {
  const res: Array<string | number> = [];
  let cur = pMap.get(id);
  while (cur !== undefined) {
    res.push(cur);
    cur = pMap.get(cur);
  }
  return res;
};

/**
 * 提交的菜单 ids：
 * - 父子联动：树已勾选节点 + 其祖先（等价 Element 的半选节点）+ 按钮 + 按钮所属菜单链
 * - 非联动：仅树已勾选节点 + 按钮
 */
const collectMenuIds = (): Array<string | number> => {
  const set = new Set<string | number>([...menuChecked.value, ...buttonChecked]);
  if (form.menuCheckStrictly) {
    menuChecked.value.forEach((id) => collectAncestors(id, parentMap.value).forEach((a) => set.add(a)));
    buttonChecked.forEach((id) => collectOwnerChain(id).forEach((a) => set.add(a)));
  }
  return Array.from(set);
};

// 部门树 父子联动时补齐半选祖先
const deptParentMap = computed(() => {
  const map = new Map<string | number, string | number>();
  const walk = (nodes: any[], parentId?: string | number) =>
    nodes.forEach((n) => {
      if (parentId !== undefined) map.set(n.id, parentId);
      if (n.children?.length) walk(n.children, n.id);
    });
  walk(deptTree.value);
  return map;
});
const collectDeptIds = (): Array<string | number> => {
  const set = new Set<string | number>(deptChecked.value);
  if (form.deptCheckStrictly) {
    deptChecked.value.forEach((id) => collectAncestors(id, deptParentMap.value).forEach((a) => set.add(a)));
  }
  return Array.from(set);
};

const initForm = (): RoleForm => ({
  roleId: undefined,
  roleName: '',
  roleKey: '',
  roleSort: 0,
  status: '0',
  menuCheckStrictly: true,
  deptCheckStrictly: true,
  remark: '',
  dataScope: '1',
  menuIds: [],
  deptIds: [],
});

const form = reactive<RoleForm>(initForm());

const rules: Record<string, FormRule[]> = {
  roleName: [{ required: true, message: '请输入角色名称', type: 'error' }],
  roleKey: [{ required: true, message: '请输入权限字符', type: 'error' }],
  roleSort: [{ required: true, message: '请输入显示排序', type: 'error' }],
};

const dataScopeOptions = [
  { label: '全部数据权限', value: '1' },
  { label: '自定数据权限', value: '2' },
  { label: '本部门数据权限', value: '3' },
  { label: '本部门及以下数据权限', value: '4' },
  { label: '仅本人数据权限', value: '5' },
  { label: '部门及以下或本人数据权限', value: '6' },
];

const toDeptTreeSelect = (list: DeptVO[]): any[] => {
  return list.map((d) => ({
    id: d.deptId,
    label: d.deptName,
    children: d.children?.length ? toDeptTreeSelect(d.children) : undefined,
  }));
};

const handleAdd = async () => {
  Object.assign(form, initForm());
  menuChecked.value = [];
  buttonChecked.clear();
  activeTab.value = 'base';
  // 菜单树
  const mres = await menuTreeselect();
  const built = buildDisplay((mres?.data ?? []) as MenuTreeOption[]);
  menuTreeDisplay.value = built.tree;
  buttonPermIds.value = built.buttonIds;
  // 部门树
  const dres = await listDept();
  deptTree.value = toDeptTreeSelect(handleTree<DeptVO>((dres?.data ?? []) as DeptVO[], 'deptId'));
  dialogTitle.value = '新增角色';
  dialogVisible.value = true;
};

const handleUpdate = async (row?: RoleVO) => {
  const target = row ?? selectedRows.value[0];
  if (!target) return;
  Object.assign(form, initForm());
  activeTab.value = 'base';
  // 基本信息
  Object.assign(form, {
    roleId: target.roleId,
    roleName: target.roleName,
    roleKey: target.roleKey,
    roleSort: target.roleSort,
    status: target.status,
    remark: target.remark ?? '',
    dataScope: target.dataScope,
    menuCheckStrictly: target.menuCheckStrictly,
    deptCheckStrictly: target.deptCheckStrictly,
  });
  // 菜单树 + 已选（拆分 M/C 与 F 按钮权限）
  const mres = await roleMenuTreeselect(target.roleId);
  const built = buildDisplay((mres?.data?.menus ?? []) as MenuTreeOption[]);
  menuTreeDisplay.value = built.tree;
  buttonPermIds.value = built.buttonIds;
  const checkedKeys = (mres?.data?.checkedKeys ?? []) as Array<string | number>;
  const menuSel = new Set<string | number>();
  buttonChecked.clear();
  checkedKeys.forEach((id) => {
    if (built.buttonIds.has(id)) {
      buttonChecked.add(id);
      // 父子联动时后端只回传叶子（按钮），其所属菜单需在树上显示为已勾选
      const owner = buttonOwner.value.get(id);
      if (form.menuCheckStrictly && owner !== undefined) menuSel.add(owner);
    } else {
      menuSel.add(id);
    }
  });
  menuChecked.value = Array.from(menuSel);
  // 部门树 + 已选
  const dres = await deptTreeSelect(target.roleId);
  deptTree.value = (dres?.data?.depts ?? []) as any[];
  deptChecked.value = (dres?.data?.checkedKeys ?? []) as Array<string | number>;
  dialogTitle.value = '修改角色';
  dialogVisible.value = true;
};

const expandMenuAll = (expand: boolean) => {
  const inst = menuTreeRef.value;
  if (expand) inst?.expandAll?.();
  else inst?.foldAll?.();
};
const checkMenuAll = (check: boolean) => {
  menuChecked.value = check ? collectKeys(menuTreeDisplay.value, 'id') : [];
  if (check) {
    buttonPermIds.value.forEach((id) => buttonChecked.add(id));
  } else {
    buttonChecked.clear();
  }
};
const expandDeptAll = (expand: boolean) => {
  const inst = deptTreeRef.value;
  if (expand) inst?.expandAll?.();
  else inst?.foldAll?.();
};
const checkDeptAll = (check: boolean) => {
  deptChecked.value = check ? collectKeys(deptTree.value, 'id') : [];
};

const collectKeys = (nodes: any[], key: string): Array<string | number> => {
  const res: Array<string | number> = [];
  const walk = (list: any[]) => {
    list.forEach((n) => {
      res.push(n[key]);
      if (n.children?.length) walk(n.children);
    });
  };
  walk(nodes);
  return res;
};

const onSubmit = async () => {
  if (activeTab.value !== 'base') {
    // 切回基础信息标签以触发校验展示
    activeTab.value = 'base';
  }
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    // 菜单/部门 ids 只从 v-model 状态计算，不依赖树组件实例（标签页切换不会丢数据）
    form.menuIds = collectMenuIds();
    form.deptIds = form.dataScope === '2' ? collectDeptIds() : [];
    if (form.roleId) {
      await updateRole(form);
      await updateRolePermission({
        roleId: form.roleId,
        menuIds: form.menuIds,
        deptIds: form.deptIds,
        dataScope: form.dataScope,
        menuCheckStrictly: form.menuCheckStrictly,
        deptCheckStrictly: form.deptCheckStrictly,
      });
      MessagePlugin.success('修改成功');
    } else {
      await addRole(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (row?: RoleVO) => {
  const ids = row ? [row.roleId] : selectedRows.value.map((r) => r.roleId);
  if (!ids.length) return;
  await delRole(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

// ---- 分配用户 ----
const handleAuthUser = (row: RoleVO) => {
  router.push(`/system/role-auth/user/${row.roleId}`);
};

// ---- 导出 ----
const handleExport = () => download('/system/role/export', { ...queryParams }, `role_${Date.now()}.xlsx`);

getList();
</script>

<style lang="less" scoped>
.role-page {
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
.tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.tree-wrap {
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-default);
  padding: 8px;
}
.menu-perm-tree :deep(.node-buttons) {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-left: 12px;
}
.menu-perm-tree :deep(.t-tree__operations) {
  margin-left: 0;
}
</style>
