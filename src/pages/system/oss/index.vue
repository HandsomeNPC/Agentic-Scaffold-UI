<template>
  <div class="oss-page">
    <t-card :bordered="false">
      <template #title><div class="card-title">对象存储</div></template>

      <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
        <t-form-item label="文件名" name="fileName"
          ><t-input v-model="queryParams.fileName" clearable placeholder="请输入文件名"
        /></t-form-item>
        <t-form-item label="原名" name="originalName"
          ><t-input v-model="queryParams.originalName" clearable placeholder="请输入原名"
        /></t-form-item>
        <t-form-item label="文件后缀" name="fileSuffix"
          ><t-input v-model="queryParams.fileSuffix" clearable placeholder="如 .png"
        /></t-form-item>
        <t-form-item label="服务商" name="service"
          ><t-input v-model="queryParams.service" clearable placeholder="服务商"
        /></t-form-item>
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
        <t-upload
          :accept="acceptTypes"
          :multiple="true"
          :request-method="customUpload"
          :show-upload-progress="true"
          :trigger-props="{ theme: 'primary' }"
          @success="onUploadSuccess"
        >
          <t-button v-hasPermi="['system:oss:upload']" theme="primary"
            ><template #icon><upload-icon /></template>上传文件</t-button
          >
        </t-upload>
        <t-upload
          :accept="'image/*'"
          :multiple="true"
          :request-method="customUpload"
          :show-upload-progress="true"
          :trigger-props="{ theme: 'success', variant: 'outline' }"
          @success="onUploadSuccess"
        >
          <t-button v-hasPermi="['system:oss:upload']" theme="success" variant="outline"
            ><template #icon><image-icon /></template>上传图片</t-button
          >
        </t-upload>
        <t-popconfirm content="是否确认删除选中的文件?" @confirm="handleDelete()">
          <t-button v-hasPermi="['system:oss:remove']" :disabled="!selectedRows.length" theme="danger" variant="outline"
            ><template #icon><delete-icon /></template>删除</t-button
          >
        </t-popconfirm>
        <t-button v-hasPermi="['system:ossConfig:list']" theme="default" variant="outline" @click="handleOssConfig"
          ><template #icon><setting-icon /></template>配置管理</t-button
        >
        <t-button
          v-hasPermi="['system:oss:edit']"
          :loading="previewLoading"
          theme="default"
          variant="outline"
          @click="togglePreview"
          ><template #icon><browse-icon /></template>预览：{{ previewListResource ? '开' : '关' }}</t-button
        >
        <right-toolbar
          v-model:show-search="showSearch"
          :columns="columns"
          class="toolbar-right"
          storage-key="sys_oss_column_visible"
          @query-table="getList"
        />
      </div>

      <t-table
        :columns="realColumns"
        :data="list"
        :default-sort="[{ sortBy: 'createTime', descending: false }]"
        :loading="loading"
        :pagination="pagination"
        :selected-row-keys="selectedKeys"
        hover
        row-key="ossId"
        stripe
        @select-change="onSelectChange"
        @page-change="onPageChange"
        @sort-change="onSortChange"
      >
        <template #fileSuffix="{ row }"
          ><t-tag variant="light-outline">{{ row.fileSuffix }}</t-tag></template
        >
        <template #preview="{ row }">
          <t-image
            v-if="previewListResource && isImage(row.fileSuffix)"
            :src="row.url"
            fit="cover"
            style="width: 60px; height: 60px; border-radius: 4px"
          />
          <span v-else :title="row.url" class="oss-url-cell">{{ row.url }}</span>
        </template>
        <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
        <template #operation="{ row }">
          <t-space size="small">
            <t-link v-if="isImage(row.fileSuffix)" hover="color" theme="primary" @click="handlePreview(row)"
              >预览</t-link
            >
            <t-link v-hasPermi="['system:oss:download']" hover="color" theme="primary" @click="handleDownload(row)"
              >下载</t-link
            >
            <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
              <t-link v-hasPermi="['system:oss:remove']" hover="color" theme="danger">删除</t-link>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <t-dialog v-model:visible="previewVisible" :footer="false" header="图片预览" width="600px">
      <img :src="previewUrl" alt="预览" class="preview-img" />
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import type { PageInfo, PrimaryTableCol, RequestMethodResponse, UploadFile } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import {
  BrowseIcon,
  DeleteIcon,
  ImageIcon,
  RefreshIcon,
  SearchIcon,
  SettingIcon,
  UploadIcon,
} from 'tdesign-icons-vue-next';
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { OssQuery, OssVO } from '@/api/system/oss/types';
import { delOss, listOss, uploadOss } from '@/api/system/oss';
import { getConfigKey, updateConfigByKey } from '@/api/system/config';
import { useDateRangeQuery } from '@/hooks/useDateRangeQuery';
import { downloadOss } from '@/utils/request';
import { getToken } from '@/utils/auth';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemOss' });

const router = useRouter();

const { dateRange, applyDateRange, resetDateRange } = useDateRangeQuery('CreateTime');

// 预览开关：读写参数 sys.oss.previewListResource（true/false，缺省时默认开启）
const previewListResource = ref(true);
const previewLoading = ref(false);
const loadPreviewConfig = async () => {
  try {
    const res = await getConfigKey('sys.oss.previewListResource');
    const val = res?.data as string;
    // 后端未配置时默认开启（与原项目一致）
    previewListResource.value = val === null || val === undefined || val === '' ? true : val === 'true';
  } catch {
    previewListResource.value = true;
  }
};
const togglePreview = async () => {
  const next = !previewListResource.value;
  previewLoading.value = true;
  try {
    await updateConfigByKey('sys.oss.previewListResource', String(next));
    previewListResource.value = next;
    MessagePlugin.success('修改成功');
  } finally {
    previewLoading.value = false;
  }
};
loadPreviewConfig();

const list = ref<OssVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<OssVO[]>([]);
const showSearch = ref(true);
const queryParams = reactive<OssQuery>({
  pageNum: 1,
  pageSize: 10,
  fileName: '',
  originalName: '',
  fileSuffix: '',
  service: '',
  orderByColumn: 'createTime',
  isAsc: 'asc',
});
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });
const acceptTypes = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt';

const columnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'ossId', title: '编号', width: 90, align: 'center' },
  { colKey: 'fileName', title: '文件名', ellipsis: true, minWidth: 200 },
  { colKey: 'originalName', title: '原名', ellipsis: true, minWidth: 160 },
  { colKey: 'fileSuffix', title: '后缀', width: 90, align: 'center' },
  { colKey: 'preview', title: '文件展示', width: 120, align: 'center' },
  { colKey: 'service', title: '服务商', width: 120, sorter: true },
  { colKey: 'createByName', title: '上传人', width: 120 },
  { colKey: 'createTime', title: '上传时间', width: 180, sorter: true },
  { colKey: 'operation', title: '操作', width: 180, fixed: 'right', align: 'center' },
];
const columns = ref<PrimaryTableCol[]>(columnsData);
const realColumns = computed<PrimaryTableCol[]>(() => {
  const all = columns.value as any[];
  return all.filter((c: any) => c.visible !== false) as unknown as PrimaryTableCol[];
});

const isImage = (suffix?: string) => {
  const img = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
  return !!suffix && img.includes(suffix.toLowerCase());
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await listOss(applyDateRange(queryParams));
    const d = res?.data;
    list.value = d?.rows ?? [];
    pagination.total = d?.total ?? 0;
    pagination.current = queryParams.pageNum ?? 1;
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
const onSortChange = (sort: any) => {
  const s = Array.isArray(sort) ? sort[0] : sort;
  if (s?.sortBy) {
    queryParams.orderByColumn = s.sortBy;
    queryParams.isAsc = s.descending ? 'desc' : 'asc';
  } else {
    queryParams.orderByColumn = undefined;
    queryParams.isAsc = undefined;
  }
  queryParams.pageNum = 1;
  getList();
};
const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};
const resetQuery = () => {
  queryParams.fileName = '';
  queryParams.originalName = '';
  queryParams.fileSuffix = '';
  queryParams.service = '';
  queryParams.orderByColumn = 'createTime';
  queryParams.isAsc = 'asc';
  resetDateRange();
  handleQuery();
};

const customUpload = async (file: UploadFile | UploadFile[]): Promise<RequestMethodResponse> => {
  // TDesign 在 multiple=true 时，requestMethod 入参是 UploadFile[]（即使按文件逐个上传也是 [file]），
  // 取首个文件的 raw 作为实际二进制；非 multiple 时入参为单个 UploadFile，统一归一化为数组处理。
  const files = Array.isArray(file) ? file : [file];
  const raw = files[0]?.raw as File | undefined;
  if (!raw) {
    return { status: 'fail', error: '未获取到文件，请重试', response: {} };
  }
  const formData = new FormData();
  formData.append('file', raw);
  try {
    const res: any = await uploadOss(formData);
    const data = res?.data;
    if (data?.ossId) {
      return { status: 'success', response: { url: data.url, ossId: data.ossId, fileName: data.fileName } };
    }
    return { status: 'fail', error: '上传失败', response: {} };
  } catch (e: any) {
    return { status: 'fail', error: e?.message || '上传失败', response: {} };
  }
};

const onUploadSuccess = () => {
  MessagePlugin.success('上传成功');
  getList();
};

const previewVisible = ref(false);
const previewUrl = ref('');
const handlePreview = (row: OssVO) => {
  previewUrl.value = row.url;
  previewVisible.value = true;
};

const handleDownload = (row: OssVO) => downloadOss(row.ossId);

const handleDelete = async (row?: OssVO) => {
  const ids = row ? [row.ossId] : selectedRows.value.map((r) => r.ossId);
  if (!ids.length) return;
  await delOss(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

// 跳转 OSS 配置管理（后端菜单：path oss-config/index，component system/oss/config）
const handleOssConfig = () => {
  router.push('/system/oss-config/index');
};

// getToken 引用避免未使用告警（未来扩展自定义上传头时使用）
void getToken;

getList();
</script>

<style lang="less" scoped>
.oss-page {
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
.preview-img {
  width: 100%;
}
.oss-url-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--td-text-color-secondary);
}
</style>
