<template>
  <div :style="wrapStyle" class="editor-wrap">
    <Toolbar
      :default-config="toolbarConfig"
      :editor="editorRef"
      :mode="mode"
      style="border-bottom: 1px solid var(--td-component-stroke)"
    />
    <Editor
      v-model="content"
      :default-config="editorConfig"
      :mode="mode"
      :style="{ height: heightStyle, overflowY: 'hidden' }"
      @on-created="handleCreated"
    />
  </div>
</template>

<script lang="ts" setup>
import '@wangeditor-next/editor/dist/css/style.css';
import { Editor, Toolbar } from '@wangeditor-next/editor-for-vue';
import { LoadingPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';

import { listByIds } from '@/api/system/oss';
import { globalHeaders } from '@/utils/request';

interface Props {
  modelValue?: string;
  height?: number | string;
  minHeight?: number | string;
  mode?: string;
  readOnly?: boolean;
  /** 图片上传大小限制(MB) */
  fileSize?: number;
  /** 视频上传大小限制(MB) */
  videoSize?: number;
  /** base64 模式或 url 模式（url 模式存储 oss://ossId 标记，展示时由后端动态解析） */
  type?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  height: 300,
  minHeight: 300,
  mode: 'default',
  readOnly: false,
  fileSize: 5,
  videoSize: 100,
  type: 'url',
});

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const editorRef = shallowRef<any>();
const content = ref('');

const baseUrl = import.meta.env.VITE_APP_BASE_API;
const uploadOssUrl = baseUrl + '/resource/oss/upload';
const OSS_MARKER_RE = /oss:\/\/([\w-]+)/g;

// URL → ossId 映射，上传/解析阶段填充
const ossUrlToId = new Map<string, string>();
// 防止 modelValue ↔ content 双向 watch 循环
const isResolvingContent = ref(false);
const lastEncodedValue = ref('');

const heightStyle = computed(() => (typeof props.height === 'number' ? `${props.height}px` : props.height));
const wrapStyle = computed(() => {
  const s: Record<string, string> = {
    border: '1px solid var(--td-component-stroke)',
    borderRadius: 'var(--td-radius-default)',
    overflow: 'hidden',
  };
  if (props.minHeight) s.minHeight = `${props.minHeight}px`;
  return s;
});

const toolbarConfig = computed(() => {
  const excludeKeys = ['fullScreen'];
  if (!props.type) {
    excludeKeys.push('uploadImage', 'uploadVideo');
  }
  return { excludeKeys };
});

/* ==================== OSS 上传 & 内容转换 ==================== */

const uploadToOss = async (file: File): Promise<{ url: string; fileName: string; ossId: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(uploadOssUrl, { method: 'POST', headers: globalHeaders(), body: formData });
  const data = await res.json();
  if (data.code === 200) {
    ossUrlToId.set(data.data.url, String(data.data.ossId));
    return data.data;
  }
  throw new Error(data.msg || '上传失败');
};

/** 编码：编辑器内容中的 OSS 真实 URL → oss://ossId 标记（存储用） */
const encodeOssContent = (html: string): string => {
  if (!html) return html;
  let result = html;
  for (const [url, ossId] of ossUrlToId) {
    result = result.replaceAll(url, `oss://${ossId}`);
  }
  return result;
};

/** 解码：存储的 oss://ossId 标记 → 真实 URL（编辑/展示用） */
const decodeOssContent = async (html: string): Promise<string> => {
  if (!html) return html;
  const matches = [...html.matchAll(OSS_MARKER_RE)];
  if (matches.length === 0) return html;
  const ossIds = [...new Set(matches.map((m) => m[1]))];
  try {
    const res = await listByIds(ossIds.join(','));
    let result = html;
    for (const oss of res.data ?? []) {
      const id = String(oss.ossId);
      ossUrlToId.set(oss.url, id);
      result = result.replaceAll(`oss://${id}`, oss.url);
    }
    return result;
  } catch {
    return html;
  }
};

/* ==================== 文件校验 ==================== */

const validateImageFile = (file: File) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg', 'image/svg+xml'];
  if (!allowed.includes(file.type)) {
    MessagePlugin.error('图片格式错误!');
    return false;
  }
  if (props.fileSize && file.size / 1024 / 1024 >= props.fileSize) {
    MessagePlugin.error(`上传图片大小不能超过 ${props.fileSize} MB!`);
    return false;
  }
  return true;
};

const validateVideoFile = (file: File) => {
  const allowed = ['video/mp4', 'video/webm', 'video/ogg'];
  if (!allowed.includes(file.type)) {
    MessagePlugin.error('视频格式错误, 请上传 mp4/webm/ogg 格式!');
    return false;
  }
  if (props.videoSize && file.size / 1024 / 1024 >= props.videoSize) {
    MessagePlugin.error(`上传视频大小不能超过 ${props.videoSize} MB!`);
    return false;
  }
  return true;
};

/* ==================== wangeditor 菜单配置 ==================== */

const getUploadImageMenuConfig = () => {
  if (props.type === 'base64') {
    return {
      allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'],
      customUpload(file: File, insertFn: (url: string, alt?: string, href?: string) => void) {
        if (!validateImageFile(file)) return;
        const reader = new FileReader();
        reader.onload = () => insertFn(reader.result as string, file.name);
        reader.onerror = () => MessagePlugin.error('图片插入失败');
        reader.readAsDataURL(file);
      },
    };
  }
  return {
    allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'],
    async customUpload(file: File, insertFn: (url: string, alt?: string, href?: string) => void) {
      if (!validateImageFile(file)) return;
      const loading = LoadingPlugin({
        fullscreen: true,
        attach: 'body',
        text: '正在上传图片，请稍候',
        showOverlay: true,
      });
      try {
        const result = await uploadToOss(file);
        insertFn(result.url, file.name, result.url);
      } catch {
        MessagePlugin.error('图片上传失败');
      } finally {
        loading.hide();
      }
    },
  };
};

const getUploadVideoMenuConfig = () => ({
  allowedFileTypes: ['video/mp4', 'video/webm', 'video/ogg'],
  async customUpload(file: File, insertFn: (url: string, poster?: string) => void) {
    if (!validateVideoFile(file)) return;
    const loading = LoadingPlugin({
      fullscreen: true,
      attach: 'body',
      text: '正在上传视频，请稍候',
      showOverlay: true,
    });
    try {
      const result = await uploadToOss(file);
      insertFn(result.url);
    } catch {
      MessagePlugin.error('视频上传失败');
    } finally {
      loading.hide();
    }
  },
});

const editorConfig = computed(() => ({
  placeholder: '请输入内容',
  autoFocus: false,
  MENU_CONF: {
    uploadImage: getUploadImageMenuConfig(),
    uploadVideo: getUploadVideoMenuConfig(),
  },
}));

/* ==================== 只读 & 双向绑定 ==================== */

const syncReadOnly = () => {
  const editor = editorRef.value;
  if (!editor) return;
  if (props.readOnly) editor.disable();
  else editor.enable();
};

watch(
  () => props.modelValue,
  async (value) => {
    const nextValue = value || '';
    // 跳过自身 emit 引起的回传
    if (nextValue === lastEncodedValue.value) return;
    isResolvingContent.value = true;
    const resolved = await decodeOssContent(nextValue);
    if (resolved !== content.value) content.value = resolved;
    nextTick(() => {
      isResolvingContent.value = false;
    });
  },
  { immediate: true },
);

watch(content, (value) => {
  if (isResolvingContent.value) return;
  const encoded = encodeOssContent(value);
  lastEncodedValue.value = encoded;
  if (encoded !== props.modelValue) emit('update:modelValue', encoded);
});

watch(
  () => props.readOnly,
  () => syncReadOnly(),
);

const handleCreated = (editor: any) => {
  editorRef.value = editor;
  syncReadOnly();
};

onBeforeUnmount(() => {
  editorRef.value?.destroy();
});
</script>

<style scoped>
.editor-wrap {
  z-index: 2;
}
.editor-wrap :deep(.w-e-toolbar) {
  border: 0 !important;
  background-color: transparent;
}
.editor-wrap :deep(.w-e-text-container) {
  border: 0 !important;
  background-color: transparent;
}
</style>
