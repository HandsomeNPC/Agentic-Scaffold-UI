<template>
  <t-dialog
    v-model:visible="innerVisible"
    :cancel-btn="null"
    :confirm-btn="{ content: multiple ? '确定（已选 ' + selectedRows.length + '）' : '确定' }"
    :header="title"
    :on-confirm="onConfirm"
    width="900px"
  >
    <div class="user-select">
      <div class="user-select__left">
        <tree-panel
          :keys="{ label: 'label', value: 'id', children: 'children' }"
          :tree-data="deptOptions"
          search-placeholder="部门名称"
          title="部门"
          @active-change="onDeptActive"
        />
      </div>
      <div class="user-select__right">
        <t-form :data="queryParams" layout="inline" @submit="handleQuery">
          <t-form-item label="用户名" name="userName">
            <t-input v-model="queryParams.userName" clearable placeholder="请输入用户名" />
          </t-form-item>
          <t-form-item label="手机号" name="phoneNumber">
            <t-input v-model="queryParams.phoneNumber" clearable placeholder="请输入手机号" />
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
          row-key="userId"
          stripe
          @select-change="onSelectChange"
          @page-change="onPageChange"
          @row-click="onRowClick"
        >
          <template #status="{ row }"><dict-tag :options="sys_normal_disable" :value="row.status" /></template>
        </t-table>
      </div>
    </div>
  </t-dialog>
</template>

<script lang="ts" setup>
import type { PrimaryTableCol, PageInfo, RowEventContext, TableRowData } from 'tdesign-vue-next';
import { SearchIcon, RefreshIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref, watch } from 'vue';

import type { UserQuery, UserVO } from '@/api/system/user/types';
import { deptTreeSelect, listUser } from '@/api/system/user';
import { useDict } from '@/utils/dict';

import TreePanel from '@/components/TreePanel/index.vue';

defineOptions({ name: 'UserSelect' });

const props = withDefaults(
  defineProps<{
    visible: boolean;
    /** 是否多选，默认 false */
    multiple?: boolean;
    /** 联动部门过滤 */
    deptId?: string | number;
    /** 排除的用户ID */
    excludeIds?: Array<string | number>;
    title?: string;
  }>(),
  {
    visible: false,
    multiple: false,
    deptId: undefined,
    excludeIds: () => [],
    title: '选择用户',
  },
);

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'confirm', rows: UserVO[]): void;
}>();

const { sys_normal_disable } = useDict('sys_normal_disable');

const innerVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
});

const list = ref<UserVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<UserVO[]>([]);
const deptOptions = ref<any[]>([]);

const queryParams = reactive<UserQuery>({
  pageNum: 1,
  pageSize: 10,
  userName: '',
  phoneNumber: '',
});
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columns: PrimaryTableCol[] = [
  { colKey: 'row-select', type: props.multiple ? 'multiple' : 'single', width: 46, align: 'center' },
  { colKey: 'userName', title: '用户名', width: 140 },
  { colKey: 'nickName', title: '昵称', width: 140 },
  { colKey: 'deptName', title: '部门', ellipsis: true },
  { colKey: 'phoneNumber', title: '手机号', width: 140 },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
];

const filterExcluded = (rows: UserVO[]) => {
  if (!props.excludeIds?.length) return rows;
  return rows.filter((r) => !props.excludeIds.includes(r.userId));
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await listUser({ ...queryParams, deptId: queryParams.deptId ?? props.deptId });
    const data = res?.data;
    // excludeIds 在前端过滤（调用方一般不传，多页场景下总数仍以后端为准）
    list.value = filterExcluded(data?.rows ?? []);
    pagination.total = data?.total ?? 0;
    pagination.current = queryParams.pageNum;
    pagination.pageSize = queryParams.pageSize;
  } finally {
    loading.value = false;
  }
};

const loadDeptOptions = async () => {
  const res = await deptTreeSelect();
  deptOptions.value = (res?.data ?? []) as any[];
};

watch(
  () => props.visible,
  (v) => {
    if (v) {
      selectedKeys.value = [];
      selectedRows.value = [];
      queryParams.userName = '';
      queryParams.phoneNumber = '';
      queryParams.deptId = props.deptId;
      queryParams.pageNum = 1;
      loadDeptOptions();
      getList();
    }
  },
);

const onSelectChange = (keys: (string | number)[], options: any) => {
  if (props.multiple) {
    selectedKeys.value = keys;
    selectedRows.value = options?.selectedRowData ?? [];
  } else {
    // 单选：取最新一条
    selectedKeys.value = keys?.slice(-1) ?? [];
    selectedRows.value = (options?.selectedRowData ?? []).slice(-1);
  }
};

const onRowClick = (context: RowEventContext<TableRowData>) => {
  if (props.multiple) return;
  const row = context.row as unknown as UserVO;
  selectedKeys.value = [row.userId];
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
  queryParams.userName = '';
  queryParams.phoneNumber = '';
  queryParams.deptId = props.deptId;
  handleQuery();
};
const onDeptActive = (id: string | number | undefined) => {
  queryParams.deptId = id;
  queryParams.pageNum = 1;
  getList();
};

const onConfirm = () => {
  emit('confirm', selectedRows.value);
  innerVisible.value = false;
};
</script>

<style lang="less" scoped>
.user-select {
  display: flex;
  gap: 12px;
}
.user-select__left {
  width: 240px;
  flex-shrink: 0;
}
.user-select__right {
  flex: 1;
  min-width: 0;
}
</style>
