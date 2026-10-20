<template>
  <div class="file-upload">
    <t-upload
      v-model="fileList"
      :accept="accept"
      :auto-upload="true"
      :disabled="disabled"
      :max="maxCount"
      :multiple="maxCount > 1"
      :request-method="customUpload"
      :show-upload-progress="true"
      :size-limit="{ size: fileSize, unit: 'MB' }"
      theme="file"
      @validate="onValidate"
    />
    <div v-if="isShowTip" class="upload-tip">
      支持 {{ accept === '*' ? '任意' : accept }} 格式，单个文件不超过 {{ fileSize }}MB，最多 {{ maxCount }} 个
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { RequestMethodResponse, UploadFile } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { onMounted, ref, watch } from 'vue';

import { listByIds, uploadOss } from '@/api/system/oss';

interface Props {
  /** ossId 逗号分隔字符串 */
  modelValue?: string;
  /** 允许上传数量上限 */
  limit?: number;
  accept?: string;
  /** 单文件大小限制(MB) */
  fileSize?: number;
  disabled?: boolean;
  isShowTip?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  limit: 5,
  accept: '*',
  fileSize: 5,
  disabled: false,
  isShowTip: false,
});
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const maxCount = props.limit;
const fileList = ref<UploadFile[]>([]);

const customUpload = async (file: UploadFile | UploadFile[]): Promise<RequestMethodResponse> => {
  // multiple=true 时 TDesign 传 UploadFile[]（逐文件也是 [file]）；单文件传单个对象。统一归一化。
  const files = Array.isArray(file) ? file : [file];
  const target = files[0];
  const raw = target?.raw as File | undefined;
  if (!raw) {
    return { status: 'fail', error: '未获取到文件，请重试', response: {} };
  }
  const formData = new FormData();
  formData.append('file', raw);
  try {
    const res: any = await uploadOss(formData);
    const data = res?.data;
    if (data?.ossId) {
      // 把 ossId 回填到文件对象；emit 由 fileList 的 watcher 统一处理（此处不直接 emit，
      // 否则在 TDesign 把文件正式写入 fileList 之前 emit 会漏掉刚上传的 ossId）
      (target as any).ossId = data.ossId;
      (target as any).url = data.url;
      (target as any).name = data.fileName || target.name;
      return { status: 'success', response: { url: data.url, ossId: data.ossId, fileName: data.fileName } };
    }
    return { status: 'fail', error: '上传失败', response: {} };
  } catch (e: any) {
    return { status: 'fail', error: e?.message || '上传失败', response: {} };
  }
};

const onValidate = (ctx: any) => {
  if (ctx?.type === 'FILE_OVER_SIZE_LIMIT') {
    MessagePlugin.error(`文件大小不能超过 ${props.fileSize}MB`);
  }
};

// 统一在 fileList 变化时收集 ossId 并 emit（覆盖上传成功、删除两种场景）
watch(
  fileList,
  (arr) => {
    const ids = arr
      .map((f: any) => f.ossId)
      .filter(Boolean)
      .join(',');
    if (ids !== props.modelValue) emit('update:modelValue', ids);
  },
  { deep: true },
);

// 外部 modelValue 变化时回填文件列表（新增/编辑切换、父组件清空）
let loadingExternal = false;
const loadExisting = async () => {
  if (!props.modelValue) {
    fileList.value = [];
    return;
  }
  // 已经是同一批 ossId 则不重复加载
  const currentIds = fileList.value
    .map((f: any) => String(f.ossId))
    .filter(Boolean)
    .join(',');
  if (currentIds === props.modelValue) return;
  loadingExternal = true;
  try {
    const res = await listByIds(props.modelValue);
    const data = (res?.data ?? []) as any[];
    fileList.value = data.map((o) => ({
      name: o.fileName,
      url: o.url,
      status: 'success',
      ossId: o.ossId,
    }));
  } catch (e) {
    console.error(e);
  } finally {
    loadingExternal = false;
  }
};

onMounted(loadExisting);
watch(
  () => props.modelValue,
  () => {
    if (!loadingExternal) loadExisting();
  },
);
</script>

<style scoped>
.upload-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
</style>
