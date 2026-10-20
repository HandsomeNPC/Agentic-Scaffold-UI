<template>
  <div class="image-upload">
    <t-upload
      v-model="fileList"
      :accept="accept"
      :auto-upload="true"
      :disabled="disabled"
      :limit="limit"
      :max="maxCount"
      :multiple="maxCount > 1"
      :request-method="customUpload"
      :show-upload-progress="true"
      :size-limit="{ size: fileSize, unit: 'MB' }"
      :theme="maxCount > 1 ? 'image' : 'image'"
      :trigger-props="{ theme: 'primary' }"
      @validate="onValidate"
    />
    <div v-if="isShowTip" class="upload-tip">
      支持 {{ accept === 'image/*' ? '图片' : accept }} 格式，单张不超过 {{ fileSize }}MB，最多 {{ maxCount }} 张
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
  limit: 1,
  accept: 'image/*',
  fileSize: 5,
  disabled: false,
  isShowTip: false,
});
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const maxCount = props.limit;
const fileList = ref<UploadFile[]>([]);

const customUpload = async (file: UploadFile | UploadFile[]): Promise<RequestMethodResponse> => {
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
      // ossId 回填到文件对象；emit 交给 fileList watcher（避免 TDesign 写入前 emit 漏掉新文件）
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
    MessagePlugin.error(`图片大小不能超过 ${props.fileSize}MB`);
  }
};

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

let loadingExternal = false;
const loadExisting = async () => {
  if (!props.modelValue) {
    fileList.value = [];
    return;
  }
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

watch(fileList, (arr) => {
  if (arr.some((f: any) => f.status === 'fail')) {
    MessagePlugin.error('部分图片上传失败');
  }
});
</script>

<style scoped>
.image-upload :deep(.t-upload__card) {
  width: auto;
}
.upload-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
</style>
