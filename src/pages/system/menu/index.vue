<template>
  <div class="menu-page">
    <t-card :bordered="false">
      <template #title>
        <div class="card-title">菜单管理</div>
      </template>

      <!-- 搜索 -->
      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="菜单名称" name="menuName">
          <t-input v-model="queryParams.menuName" clearable placeholder="请输入菜单名称" />
        </t-form-item>
        <t-form-item label="状态" name="status">
          <dict-select
            v-model="queryParams.status"
            placeholder="菜单状态"
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

      <div class="toolbar">
        <t-button v-hasPermi="['system:menu:add']" theme="primary" @click="handleAdd()">
          <template #icon><add-icon /></template>
          新增
        </t-button>
        <t-button theme="default" variant="outline" @click="toggleExpand">
          <template #icon><t-icon name="chevron-down" /></template>
          展开/折叠
        </t-button>
        <t-button v-hasPermi="['system:menu:remove']" theme="danger" variant="outline" @click="handleCascadeDelete">
          <template #icon><delete-icon /></template>
          级联删除
        </t-button>
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="sys_menu_column_visible"
          @query-table="getList"
        />
      </div>

      <t-enhanced-table
        ref="tableRef"
        :columns="realColumns"
        :data="menuList"
        :loading="loading"
        :tree="{ childrenKey: 'children', defaultExpandAll: true }"
        hover
        row-key="menuId"
      >
        <template #menuName="{ row }">
          <span class="menu-name">
            <svg-icon v-if="row.icon" :icon-class="row.icon" class="menu-icon" />
            {{ row.menuName }}
          </span>
        </template>
        <template #menuType="{ row }">
          <t-tag :theme="typeMeta(row).theme" variant="light">{{ typeMeta(row).label }}</t-tag>
        </template>
        <template #status="{ row }">
          <dict-tag :options="sys_normal_disable" :value="row.status" />
        </template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['system:menu:add']" hover="color" theme="primary" @click="handleAdd(row)">新增</t-link>
            <t-link v-hasPermi="['system:menu:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除该菜单?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:menu:remove']" hover="color" theme="danger">删除</t-link>
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
      width="680px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="100px" @submit="onSubmit">
        <t-row>
          <t-col :span="6">
            <t-form-item label="上级菜单" name="parentId">
              <t-tree-select
                v-model="form.parentId"
                :data="parentOptions"
                :keys="{ label: 'label', value: 'value', children: 'children' }"
                clearable
                filterable
                placeholder="请选择上级菜单"
              />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="菜单类型" name="menuType">
              <t-radio-group v-model="form.menuType">
                <t-radio value="M">目录</t-radio>
                <t-radio value="C">菜单</t-radio>
                <t-radio value="F">按钮</t-radio>
              </t-radio-group>
            </t-form-item>
          </t-col>
        </t-row>
        <t-row>
          <t-col :span="6">
            <t-form-item label="菜单名称" name="menuName">
              <t-input v-model="form.menuName" placeholder="请输入菜单名称" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="显示排序" name="orderNum">
              <t-input-number v-model="form.orderNum" :min="0" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-form-item v-if="form.menuType !== 'F'" label="菜单图标" name="icon">
          <icon-select v-model="form.icon" style="width: 260px" />
        </t-form-item>

        <t-row v-if="form.menuType !== 'F'">
          <t-col :span="6">
            <t-form-item name="path">
              <template #label>
                <t-tooltip content="访问的路由地址，如：user，外网地址需内链访问则以 http(s):// 开头">
                  路由地址 <help-circle-icon class="label-tip-icon" />
                </t-tooltip>
              </template>
              <t-input v-model="form.path" placeholder="请输入路由地址" />
            </t-form-item>
          </t-col>
          <t-col v-if="form.menuType === 'C'" :span="6">
            <t-form-item name="component">
              <template #label>
                <t-tooltip content="访问的组件路径，如：system/user/index，默认在 views 目录下">
                  组件路径 <help-circle-icon class="label-tip-icon" />
                </t-tooltip>
              </template>
              <t-input v-model="form.component" placeholder="如 system/user/index" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-row v-if="form.menuType !== 'M'">
          <t-col :span="6">
            <t-form-item name="perms">
              <template #label>
                <t-tooltip content="控制器中定义的权限字符，如：@SaCheckPermission('system:user:list')">
                  权限标识 <help-circle-icon class="label-tip-icon" />
                </t-tooltip>
              </template>
              <t-input v-model="form.perms" placeholder="如 system:user:list" />
            </t-form-item>
          </t-col>
          <t-col v-if="form.menuType === 'C'" :span="6">
            <t-form-item name="queryParam">
              <template #label>
                <t-tooltip content='访问路由的默认传递参数，如：{"id": 1, "name": "ry"}'>
                  路由参数 <help-circle-icon class="label-tip-icon" />
                </t-tooltip>
              </template>
              <t-input v-model="form.queryParam" placeholder='如 {"id": 1}' />
            </t-form-item>
          </t-col>
        </t-row>

        <t-row v-if="form.menuType !== 'F'">
          <t-col :span="6">
            <t-form-item name="isFrame">
              <template #label>
                <t-tooltip content="选择是外链则路由地址需要以 http(s):// 开头">
                  是否外链 <help-circle-icon class="label-tip-icon" />
                </t-tooltip>
              </template>
              <dict-select v-model="form.isFrame" placeholder="请选择" type="sys_yes_no" />
            </t-form-item>
          </t-col>
          <t-col v-if="form.menuType === 'C'" :span="6">
            <t-form-item name="isCache">
              <template #label>
                <t-tooltip content="选择是则会被 keep-alive 缓存，需要匹配组件 name 与路由地址保持一致">
                  是否缓存 <help-circle-icon class="label-tip-icon" />
                </t-tooltip>
              </template>
              <t-radio-group v-model="form.isCache">
                <t-radio value="Y">缓存</t-radio>
                <t-radio value="N">不缓存</t-radio>
              </t-radio-group>
            </t-form-item>
          </t-col>
        </t-row>

        <t-row>
          <t-col :span="6">
            <t-form-item name="visible">
              <template #label>
                <t-tooltip content="隐藏后该菜单仍可路由，但不在侧边栏显示；隐藏菜单可填写激活路由以高亮父菜单">
                  显示状态 <help-circle-icon class="label-tip-icon" />
                </t-tooltip>
              </template>
              <dict-select v-model="form.visible" placeholder="请选择" type="sys_show_hide" />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="菜单状态" name="status">
              <dict-select v-model="form.status" placeholder="请选择" type="sys_normal_disable" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-row v-if="form.visible !== '0'">
          <t-col :span="6">
            <t-form-item name="activeMenu">
              <template #label>
                <t-tooltip content="隐藏菜单填写默认激活路由，如 /system/user，使侧边栏高亮对应父菜单">
                  激活路由 <help-circle-icon class="label-tip-icon" />
                </t-tooltip>
              </template>
              <t-input v-model="form.activeMenu" placeholder="如 /system/user" />
            </t-form-item>
          </t-col>
        </t-row>

        <t-form-item label="备注" name="remark">
          <t-textarea v-model="form.remark" :autosize="{ minRows: 2 }" placeholder="请输入备注" />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 级联删除 弹窗 -->
    <t-dialog
      v-model:visible="cascadeVisible"
      :confirm-btn="{ loading: cascadeSubmitting }"
      :on-confirm="submitCascadeDelete"
      header="级联删除菜单"
      width="480px"
    >
      <t-tree
        ref="cascadeTreeRef"
        v-model="cascadeChecked"
        :data="cascadeTreeData"
        :keys="{ label: 'label', value: 'id', children: 'children' }"
        checkable
        expand-all
        hover
        value-mode="all"
      />
      <div class="cascade-tip">勾选要级联删除的菜单节点（含子节点），不可恢复。</div>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { AddIcon, DeleteIcon, HelpCircleIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';

import type { MenuForm, MenuQuery, MenuTreeOption, MenuVO } from '@/api/system/menu/types';
import { addMenu, cascadeDelMenu, delMenu, listMenu, treeselect, updateMenu } from '@/api/system/menu';
import { useDict } from '@/utils/dict';
import { handleTree, parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemMenu' });

const { sys_normal_disable, sys_show_hide, sys_yes_no } = useDict('sys_normal_disable', 'sys_show_hide', 'sys_yes_no');

const menuList = ref<MenuVO[]>([]);
const loading = ref(false);
const tableRef = ref();
const isExpandAll = ref(true);
const showSearch = ref(true);

const queryParams = reactive<MenuQuery>({
  menuName: '',
  status: '',
});

const columnsData: PrimaryTableCol[] = [
  { colKey: 'menuName', title: '菜单名称', width: 240 },
  { colKey: 'menuType', title: '类型', width: 90, align: 'center' },
  { colKey: 'orderNum', title: '排序', width: 80, align: 'center' },
  { colKey: 'perms', title: '权限标识', width: 200, ellipsis: true },
  { colKey: 'path', title: '路由地址', width: 180, ellipsis: true },
  { colKey: 'component', title: '组件路径', width: 200, ellipsis: true },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
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
    const res = await listMenu(queryParams);
    const data = Array.isArray(res?.data) ? res.data : [];
    menuList.value = handleTree<MenuVO>(data, 'menuId');
  } finally {
    loading.value = false;
  }
};

const handleQuery = () => getList();
const resetQuery = () => {
  queryParams.menuName = '';
  queryParams.status = '';
  getList();
};

const toggleExpand = () => {
  isExpandAll.value = !isExpandAll.value;
  if (isExpandAll.value) tableRef.value?.expandAll?.();
  else tableRef.value?.foldAll?.();
};

const typeMeta = (row: any): { label: string; theme: any } => {
  const t = row?.menuType;
  if (t === 'F') return { label: '按钮', theme: 'warning' };
  if (row?.isFrame === 'Y') return { label: '外链', theme: 'danger' };
  switch (t) {
    case 'M':
      return { label: '目录', theme: 'primary' };
    case 'C':
      return { label: '菜单', theme: 'success' };
    default:
      return { label: t, theme: 'default' };
  }
};

// ---- 表单 ----
const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const parentOptions = ref<any[]>([]);

const initForm = (): MenuForm => ({
  parentId: 0,
  menuId: undefined,
  menuName: '',
  orderNum: 0,
  path: '',
  component: '',
  queryParam: '',
  isFrame: 'N',
  isCache: 'Y',
  menuType: 'M',
  visible: '0',
  status: '0',
  icon: '',
  remark: '',
  perms: '',
  activeMenu: '',
});

const form = reactive<MenuForm>(initForm());

const rules: Record<string, FormRule[]> = {
  menuName: [{ required: true, message: '请输入菜单名称', type: 'error' }],
  orderNum: [{ required: true, message: '请输入显示排序', type: 'error' }],
  path: [
    {
      validator: (val) => (form.menuType !== 'F' ? !!val : true),
      message: '请输入路由地址',
      type: 'error',
    },
  ],
};

/** MenuTreeOption → t-tree-select 数据 */
const toTreeSelect = (list: MenuTreeOption[]): any[] => {
  return list.map((d) => ({
    label: d.label,
    value: d.id,
    children: d.children?.length ? toTreeSelect(d.children) : undefined,
  }));
};

const loadParentOptions = async () => {
  const res = await treeselect();
  const data = Array.isArray(res?.data) ? res.data : [];
  parentOptions.value = [{ label: '主类目', value: 0 }, ...toTreeSelect(data)];
};

const handleAdd = async (row?: MenuVO) => {
  Object.assign(form, initForm());
  if (row) form.parentId = row.menuId;
  await loadParentOptions();
  dialogTitle.value = '新增菜单';
  dialogVisible.value = true;
};

const handleUpdate = async (row: MenuVO) => {
  Object.assign(form, initForm());
  Object.assign(form, {
    parentId: row.parentId,
    menuId: row.menuId,
    menuName: row.menuName,
    orderNum: row.orderNum,
    path: row.path,
    component: row.component,
    queryParam: row.queryParam,
    isFrame: row.isFrame,
    isCache: row.isCache,
    menuType: row.menuType,
    visible: row.visible,
    status: row.status,
    icon: row.icon,
    remark: row.remark,
    perms: row.perms,
    activeMenu: row.activeMenu ?? '',
  });
  await loadParentOptions();
  dialogTitle.value = '修改菜单';
  dialogVisible.value = true;
};

const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.menuId) {
      await updateMenu(form);
      MessagePlugin.success('修改成功');
    } else {
      await addMenu(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (row: MenuVO) => {
  await delMenu(row.menuId);
  MessagePlugin.success('删除成功');
  getList();
};

// ---- 级联删除 ----
const cascadeVisible = ref(false);
const cascadeSubmitting = ref(false);
const cascadeTreeRef = ref();
const cascadeChecked = ref<Array<string | number>>([]);
const cascadeTreeData = ref<any[]>([]);
const handleCascadeDelete = async () => {
  cascadeChecked.value = [];
  const res = await treeselect();
  // treeselect 返回 {id,label,children} 树，直接用
  cascadeTreeData.value = (res?.data ?? []) as any[];
  cascadeVisible.value = true;
};
const submitCascadeDelete = async () => {
  const ids = cascadeChecked.value;
  if (!ids.length) {
    MessagePlugin.warning('请选择要删除的菜单');
    return;
  }
  cascadeSubmitting.value = true;
  try {
    await cascadeDelMenu(ids);
    MessagePlugin.success('删除成功');
    cascadeVisible.value = false;
    getList();
  } finally {
    cascadeSubmitting.value = false;
  }
};

getList();
</script>

<style lang="less" scoped>
.menu-page {
  padding: 16px;
}
.label-tip-icon {
  vertical-align: -2px;
  color: var(--td-text-color-secondary);
  margin-left: 2px;
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
.cascade-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
.menu-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.menu-icon {
  font-size: 16px;
}
</style>
