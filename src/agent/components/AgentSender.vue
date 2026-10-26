<template>
  <t-chat-sender
    v-model="inputValue"
    :attachments-props="senderAttachmentsProps"
    :loading="loading"
    :textarea-props="{ placeholder: '说点什么，比如：我想买两杯芋泥波波' }"
    @remove="handleAttachmentRemove"
    @send="handleSend"
    @stop="handleStop"
    @file-select="handleFileSelect"
  >
    <template #suffix="{ renderPresets }">
      <component :is="() => renderPresets(senderActions)" />
    </template>
  </t-chat-sender>
</template>
<script lang="ts">
/** 发送给父组件的单个附件载荷，已过滤掉上传中/失败的占位项。 */
export interface SendAttachment {
  fileType: 'image' | 'txt';
  name: string;
  url: string;
  size: number;
  extension: string;
  metadata?: { attachmentId?: string } & Record<string, unknown>;
}
</script>
<script lang="ts" setup>
import type { TdAttachmentItem, UploadActionConfig } from '@tdesign-vue-next/chat';
import { ChatSender as TChatSender } from '@tdesign-vue-next/chat';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, ref } from 'vue';

import { isHandledRequestError } from '@/utils/request';

import { uploadAttachment } from '../api/thread';

defineProps<{ loading: boolean }>();

const emit = defineEmits<{
  send: [payload: { prompt: string; attachments: SendAttachment[] }];
  stop: [];
}>();

const inputValue = ref('');

// ---------- 附件 ----------

/**
 * 允许上传的 MIME 类型白名单。
 * 与后端 attachment.allowedMIME 对齐（不收音视频与 svg），大小上限对齐 ai.attachment.maxSizeMB，
 * 此处只做前置过滤，减少无效请求，以后端校验为准。
 */
const ALLOWED_MIME = new Set([
  // 图片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // 文档
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB，与后端 ai.attachment.maxSizeMB 默认值对齐

/** 图片 picker 的 accept 列表，与 ALLOWED_MIME 里的图片子集对齐。 */
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
/** 文档 picker 的 accept 列表，与 ALLOWED_MIME 里的文档子集对齐。 */
const FILE_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
].join(',');

/**
 * 传给 renderPresets 的 actions 数组，让 sender 渲染图片 + 附件两个上传按钮。
 * 不提供 action 字段 → sender 回落到内置默认 action，继续 emit fileSelect；
 * 故用断言绕开 UploadActionConfig.action 必填的类型标注。
 */
const senderActions = [
  { name: 'uploadImage', uploadProps: { multiple: true, accept: IMAGE_ACCEPT } },
  { name: 'uploadAttachment', uploadProps: { multiple: true, accept: FILE_ACCEPT } },
] as unknown as UploadActionConfig[];

/** 当前待发的附件列表，驱动 sender 的预览条。 */
const pendingAttachments = ref<TdAttachmentItem[]>([]);

/** sender 的 :attachments-props 绑定值，列表非空时显示预览条。 */
const senderAttachmentsProps = computed(() => ({
  items: pendingAttachments.value,
  overflow: 'scrollX' as const,
}));

/**
 * sender 的 @file-select 事件：校验类型/大小后上传到 OSS，
 * 上传成功则把 TdAttachmentItem 追加到预览列表。
 */
async function handleFileSelect({ files, name }: { files: File[]; name: string }) {
  for (const file of files) {
    if (!ALLOWED_MIME.has(file.type)) {
      MessagePlugin.warning(`「${file.name}」格式不支持，请上传图片、PDF、Word、Excel、PPT 或 TXT 文件`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      MessagePlugin.warning(`「${file.name}」超过 10 MB 限制`);
      continue;
    }

    // 先在预览条占位，status=loading
    const key = `${Date.now()}-${file.name}`;
    const placeholder: TdAttachmentItem = {
      key,
      name: file.name,
      size: file.size,
      type: name === 'uploadImage' ? 'image' : 'file',
      status: 'progress' as never,
      percent: 0,
      raw: file as never,
    };
    pendingAttachments.value = [...pendingAttachments.value, placeholder];

    try {
      const res = await uploadAttachment(file);
      const url = res.data?.url ?? '';
      // 后端 transport=url 时返回 attachmentId，url 是有时效的预览地址：后端只认 ID，按字符串存
      // （雪花 ID 超出 JS 安全整数），它也随展示消息落库，后端加载历史时按它把过期的 url 换新。
      // transport=base64 时不返回 ID，url 是 data URL，发送时原样回传、由后端重新校验。
      const attachmentId = res.data?.attachmentId ? String(res.data.attachmentId) : '';
      const metadata = attachmentId ? { attachmentId } : undefined;
      pendingAttachments.value = pendingAttachments.value.map((item) =>
        item.key === key ? { ...item, url, metadata, status: 'success' as never, percent: 100 } : item,
      );
    } catch (err) {
      pendingAttachments.value = pendingAttachments.value.filter((item) => item.key !== key);
      notifyError(err, `「${file.name}」上传失败`);
    }
  }
}

/** sender 的 @remove 事件：从预览列表中移除对应附件。 */
function handleAttachmentRemove(e: CustomEvent<TdAttachmentItem>) {
  const removed = e?.detail;
  if (!removed?.key) return;
  pendingAttachments.value = pendingAttachments.value.filter((item) => item.key !== removed.key);
}

/**
 * sender 的 @send 事件：拼好载荷后 emit 给父组件，由父组件确保会话后再发。
 * 不在此处清空输入/附件——清空时机交给父组件，确保 newThread 失败时用户输入不丢。
 */
function handleSend(prompt: string) {
  const text = prompt.trim();
  const hasAttachments = pendingAttachments.value.length > 0;
  if (!text && !hasAttachments) return;

  // 只取上传成功的附件传给 engine，过滤掉仍在上传中或失败的占位项。
  const attachments: SendAttachment[] = pendingAttachments.value
    .filter((item) => (item.status as string) === 'success' && (item.metadata?.attachmentId || isDataURL(item.url)))
    .map((item) => ({
      // fileType 只影响气泡里的图标/预览；后端按 OSS 记录的文件名自行判定类型。
      fileType: (item.type === 'image' ? 'image' : 'txt') as 'image' | 'txt',
      name: item.name ?? '',
      url: item.url ?? '',
      size: item.size ?? 0,
      extension: item.name?.split('.').pop() ?? '',
      metadata: item.metadata,
    }));

  emit('send', { prompt: text, attachments });
}

/** 后端 transport=base64 时附件以 data URL 回传。 */
function isDataURL(url?: string) {
  return !!url && url.startsWith('data:');
}

function handleStop() {
  emit('stop');
}

/** axios 拦截器已提示过的错误不再重复弹 */
function notifyError(err: unknown, fallback: string) {
  if (isHandledRequestError(err)) return;
  MessagePlugin.error(err instanceof Error && err.message ? err.message : fallback);
}

/** 发送成功后由父组件调用，清空输入框与附件预览条。 */
function clear() {
  inputValue.value = '';
  pendingAttachments.value = [];
}

defineExpose({ clear });
</script>
