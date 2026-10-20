<template>
  <div class="notice-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">通知公告</div></template>

      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="公告标题" name="noticeTitle"
          ><t-input v-model="queryParams.noticeTitle" clearable placeholder="请输入公告标题"
        /></t-form-item>
        <t-form-item label="公告类型" name="noticeType"
          ><dict-select
            v-model="queryParams.noticeType"
            placeholder="公告类型"
            style="width: 160px"
            type="sys_notice_type"
        /></t-form-item>
        <t-form-item label="创建人" name="createByName"
          ><t-input v-model="queryParams.createByName" clearable placeholder="请输入创建人"
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
        <t-button v-hasPermi="['system:notice:add']" theme="primary" @click="handleAdd"
          ><template #icon><add-icon /></template>新增</t-button
        >
        <t-button
          v-hasPermi="['system:notice:edit']"
          :disabled="single"
          theme="success"
          variant="outline"
          @click="handleUpdate()"
          ><template #icon><edit-icon /></template>修改</t-button
        >
        <t-popconfirm content="是否确认删除选中的公告?" @confirm="handleDelete()">
          <t-button v-hasPermi="['system:notice:remove']" :disabled="multiple" theme="danger" variant="outline"
            ><template #icon><delete-icon /></template>删除</t-button
          >
        </t-popconfirm>
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="sys_notice_column_visible"
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
        row-key="noticeId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
      >
        <template #noticeType="{ row }"><dict-tag :options="sys_notice_type" :value="row.noticeType" /></template>
        <template #status="{ row }"><dict-tag :options="sys_notice_status" :value="row.status" /></template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-hasPermi="['system:notice:query']" hover="color" theme="primary" @click="handleDetail(row)"
              >详细</t-link
            >
            <t-link v-hasPermi="['system:notice:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
              >修改</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:notice:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 公告详情 抽屉（富文本只读预览） -->
    <t-drawer v-model:visible="detailVisible" :footer="false" :header="detailData?.noticeTitle" size="520px">
      <div v-if="detailData">
        <t-descriptions :column="1" bordered>
          <t-descriptions-item label="公告类型">
            <dict-tag :options="sys_notice_type" :value="detailData.noticeType" />
          </t-descriptions-item>
          <t-descriptions-item label="状态">
            <dict-tag :options="sys_notice_status" :value="detailData.status" />
          </t-descriptions-item>
          <t-descriptions-item label="创建人">{{ detailData.createByName || '-' }}</t-descriptions-item>
          <t-descriptions-item label="创建时间">{{ parseTime(detailData.createTime) }}</t-descriptions-item>
        </t-descriptions>
        <div class="notice-detail-content" v-html="safeNoticeContent"></div>
      </div>
    </t-drawer>

    <t-dialog
      v-model:visible="dialogVisible"
      :confirm-btn="{ loading: submitting }"
      :header="dialogTitle"
      :on-confirm="onSubmit"
      width="640px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="90px" @submit="onSubmit">
        <t-form-item label="公告标题" name="noticeTitle"
          ><t-input v-model="form.noticeTitle" placeholder="请输入公告标题"
        /></t-form-item>
        <t-row>
          <t-col :span="6"
            ><t-form-item label="公告类型" name="noticeType"
              ><dict-select v-model="form.noticeType" placeholder="请选择" type="sys_notice_type" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="公告状态" name="status"
              ><dict-select v-model="form.status" placeholder="请选择" type="sys_notice_status" /></t-form-item
          ></t-col>
        </t-row>
        <t-form-item label="内容" name="noticeContent"
          ><editor v-model="form.noticeContent" height="280px"
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
import { AddIcon, DeleteIcon, EditIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-vue-next';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { NoticeForm, NoticeQuery, NoticeVO } from '@/api/system/notice/types';
import { addNotice, delNotice, getNotice, listNotice, updateNotice } from '@/api/system/notice';
import { useDict } from '@/utils/dict';
import { resolveOssContent } from '@/utils/ossContent';
import { parseTime } from '@/utils/ruoyi';
import { sanitizeHtml } from '@/utils/sanitize';

defineOptions({ name: 'SystemNotice' });

const route = useRoute();
const router = useRouter();

const { sys_notice_type, sys_notice_status } = useDict('sys_notice_type', 'sys_notice_status');

const list = ref<NoticeVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<NoticeVO[]>([]);
const single = computed(() => selectedRows.value.length !== 1);
const multiple = computed(() => selectedRows.value.length === 0);
const showSearch = ref(true);

const queryParams = reactive<NoticeQuery>({
  pageNum: 1,
  pageSize: 10,
  noticeTitle: '',
  createByName: '',
  status: '',
  noticeType: '',
});
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'noticeId', title: '公告编号', width: 100, align: 'center' },
  { colKey: 'noticeTitle', title: '公告标题', width: 220, ellipsis: true },
  { colKey: 'noticeType', title: '公告类型', width: 120, align: 'center' },
  { colKey: 'createByName', title: '创建人', width: 120 },
  { colKey: 'status', title: '状态', width: 100, align: 'center' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 220, fixed: 'right', align: 'center' },
];
const columns = ref<PrimaryTableCol[]>(columnsData);
const realColumns = computed<PrimaryTableCol[]>(() => {
  const all = columns.value as any[];
  return all.filter((c: any) => c.visible !== false) as unknown as PrimaryTableCol[];
});

const getList = async () => {
  loading.value = true;
  try {
    const res = await listNotice(queryParams);
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
  queryParams.noticeTitle = '';
  queryParams.createByName = '';
  queryParams.status = '';
  queryParams.noticeType = '';
  handleQuery();
};

const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const initForm = (): NoticeForm => ({
  noticeId: undefined,
  noticeTitle: '',
  noticeType: '1',
  noticeContent: '',
  status: '0',
  remark: '',
  createByName: '',
});
const form = reactive<NoticeForm>(initForm());
const rules: Record<string, FormRule[]> = {
  noticeTitle: [{ required: true, message: '请输入公告标题', type: 'error' }],
  noticeType: [{ required: true, message: '请选择公告类型', type: 'error' }],
};

const handleAdd = () => {
  Object.assign(form, initForm());
  dialogTitle.value = '新增公告';
  dialogVisible.value = true;
};
const handleUpdate = async (row?: NoticeVO) => {
  const t = row ?? selectedRows.value[0];
  if (!t) return;
  // 列表行不保证带完整正文，走详情接口取最新数据
  const res = await getNotice(t.noticeId);
  const d = res?.data ?? t;
  Object.assign(form, initForm(), {
    noticeId: d.noticeId,
    noticeTitle: d.noticeTitle,
    noticeType: d.noticeType,
    noticeContent: await resolveOssContent(d.noticeContent ?? ''),
    status: d.status,
    remark: d.remark,
    createByName: d.createByName,
  });
  dialogTitle.value = '修改公告';
  dialogVisible.value = true;
};
const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.noticeId) {
      await updateNotice(form);
      MessagePlugin.success('修改成功');
    } else {
      await addNotice(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};
const handleDelete = async (row?: NoticeVO) => {
  const ids = row ? [row.noticeId] : selectedRows.value.map((r) => r.noticeId);
  if (!ids.length) return;
  await delNotice(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

// ---- 公告详情 ----
const detailVisible = ref(false);
const detailData = ref<NoticeVO | null>(null);
const safeNoticeContent = computed(() => sanitizeHtml(detailData.value?.noticeContent || ''));
const openDetail = async (noticeId: string | number) => {
  const res = await getNotice(noticeId);
  const d = res?.data;
  if (!d) return;
  d.noticeContent = await resolveOssContent(d.noticeContent ?? '');
  detailData.value = d;
  detailVisible.value = true;
};
const handleDetail = (row: NoticeVO) => openDetail(row.noticeId);

// 通知铃等入口通过 ?noticeId= 跳转过来时自动打开详情，随后清除该参数
watch(
  () => route.query.noticeId,
  async (noticeId) => {
    if (!noticeId) return;
    await openDetail(String(noticeId));
    router.replace({ query: { ...route.query, noticeId: undefined } });
  },
  { immediate: true },
);

getList();
</script>

<style lang="less" scoped>
.notice-page {
  padding: 16px;
}
.notice-detail-content {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--td-component-stroke);
  border-radius: var(--td-radius-default);
  min-height: 200px;
}
.notice-detail-content :deep(img) {
  max-width: 100%;
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
