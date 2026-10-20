<template>
  <t-dialog
    v-model:visible="innerVisible"
    :cancel-btn="null"
    :confirm-btn="{ content: multiple ? '确定（已选 ' + selectedRows.length + '）' : '确定' }"
    :header="title"
    :on-confirm="onConfirm"
    width="760px"
  >
    <div class="role-select">
      <t-form :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="角色名称" name="roleName">
          <t-input v-model="queryParams.roleName" clearable placeholder="请输入角色名称" />
        </t-form-item>
        <t-form-item label="权限字符" name="roleKey">
          <t-input v-model="queryParams.roleKey" clearable placeholder="请输入权限字符" />
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
      <t-table
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="!multiple ? undefined : selectedKeys"
        hover
        row-key="roleId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
        @row-click="onRowClick"
      >
        <template #status="{ row }"><dict-tag :options="sys_normal_disable" :value="row.status" /></template>
      </t-table>
    </div>
  </t-dialog>
</template>

<script lang="ts" setup>
import type { PrimaryTableCol, PageInfo, RowEventContext, TableRowData } from 'tdesign-vue-next';
import { SearchIcon, RefreshIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref, watch } from 'vue';

import type { RoleQuery, RoleVO } from '@/api/system/role/types';
import { listRole } from '@/api/system/role';
import { useDict } from '@/utils/dict';

defineOptions({ name: 'RoleSelect' });

const props = withDefaults(
  defineProps<{
    visible: boolean;
    multiple?: boolean;
    excludeIds?: Array<string | number>;
    title?: string;
  }>(),
  {
    visible: false,
    multiple: false,
    excludeIds: () => [],
    title: '选择角色',
  },
);

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'confirm', rows: RoleVO[]): void;
}>();

const { sys_normal_disable } = useDict('sys_normal_disable');

const innerVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
});

const list = ref<RoleVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<RoleVO[]>([]);

const queryParams = reactive<RoleQuery>({
  pageNum: 1,
  pageSize: 10,
  roleName: '',
  roleKey: '',
});
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: props.multiple ? 'multiple' : 'single', width: 46, align: 'center' },
  { colKey: 'roleId', title: '角色编号', width: 100, align: 'center' },
  { colKey: 'roleName', title: '角色名称', width: 160 },
  { colKey: 'roleKey', title: '权限字符', width: 160 },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
];

const filterExcluded = (rows: RoleVO[]) => {
  if (!props.excludeIds?.length) return rows;
  return rows.filter((r) => !props.excludeIds.includes(r.roleId));
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await listRole(queryParams);
    const data = res?.data;
    list.value = filterExcluded(data?.rows ?? []);
    pagination.total = data?.total ?? 0;
    pagination.current = queryParams.pageNum;
    pagination.pageSize = queryParams.pageSize;
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.visible,
  (v) => {
    if (v) {
      selectedKeys.value = [];
      selectedRows.value = [];
      queryParams.roleName = '';
      queryParams.roleKey = '';
      queryParams.pageNum = 1;
      getList();
    }
  },
);

const onSelectChange = (keys: (string | number)[], options: any) => {
  if (props.multiple) {
    selectedKeys.value = keys;
    selectedRows.value = options?.selectedRowData ?? [];
  } else {
    selectedKeys.value = keys?.slice(-1) ?? [];
    selectedRows.value = (options?.selectedRowData ?? []).slice(-1);
  }
};

const onRowClick = (context: RowEventContext<TableRowData>) => {
  if (props.multiple) return;
  const row = context.row as unknown as RoleVO;
  selectedKeys.value = [row.roleId];
  selectedRows.value = [row];
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
  queryParams.roleName = '';
  queryParams.roleKey = '';
  handleQuery();
};

const onConfirm = () => {
  emit('confirm', selectedRows.value);
  innerVisible.value = false;
};
</script>

<style lang="less" scoped>
.role-select {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
