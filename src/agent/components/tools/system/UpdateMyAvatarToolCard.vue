<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 SafeTool 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="done?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 修改头像失败</div>
      <div style="font-size: 12px; color: #666">{{ done.error }}</div>
    </template>

    <template v-else-if="done?.cancelled">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #888">已取消修改</div>
      <div style="font-size: 12px; color: #666">{{ done.message || '头像未变更。' }}</div>
    </template>

    <!-- 已完成：私有桶下 avatarUrl 是限时链接，刷新后可能失效，t-avatar 会回落成默认图标 -->
    <template v-else-if="done">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 头像已更新</div>
      <t-avatar :image="done.avatarUrl" size="64px" />
    </template>

    <!-- 已响应、等待后端执行结果 -->
    <template v-else-if="submitted">
      <div style="font-size: 12px; color: #999">
        {{ submitted === 'cancelled' ? '已取消，等待助手回复...' : '已确认，正在保存...' }}
      </div>
    </template>

    <!-- 待确认：用户选图，确认时才上传，取消不会留下孤儿文件 -->
    <template v-else>
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px">请选择新头像</div>
      <div class="avatars">
        <div class="avatar-item">
          <t-avatar :image="currentUrl" size="64px" />
          <span class="caption">当前</span>
        </div>
        <span class="arrow">→</span>
        <div class="avatar-item">
          <div class="picker" @click="fileInput?.click()">
            <img v-if="previewUrl" :src="previewUrl" alt="新头像" />
            <span v-else>选择图片</span>
          </div>
          <span class="caption">新头像</span>
        </div>
      </div>
      <input ref="fileInput" :accept="ACCEPT" style="display: none" type="file" @change="onFileChange" />
      <div style="font-size: 12px; color: #999; margin-top: 8px">
        支持 png、jpg、gif、webp、bmp，不超过 {{ MAX_SIZE_MB }}MB；建议使用正方形图片。
      </div>
      <div v-if="hint" style="font-size: 12px; color: #e34d59; margin-top: 4px">{{ hint }}</div>
      <t-space style="margin-top: 12px">
        <t-button :disabled="!file" :loading="uploading" theme="primary" @click="confirm">确认修改</t-button>
        <t-button :disabled="uploading" variant="outline" @click="cancel">取消</t-button>
      </t-space>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { uploadOss } from '@/api/system/oss';
import { getUserProfile } from '@/api/system/user';
import { useUserStore } from '@/store';

import type { ResumeEntry } from '../../../api/types';

/**
 * UpdateMyAvatar 工具卡片（HITL）。
 *
 * 注册为 `UpdateMyAvatar` 工具的渲染组件（见 register.ts）。工具无入参，后端中断后由用户在卡片上选图；
 * 确认时先上传 OSS，再把 ossId 作为 payload 回传。后端恢复时回查 OSS，只认本人上传的图片。
 */

/** 用户响应，对齐后端 updateMyAvatarConfirm。ossId 按字符串传：雪花 ID 超出 JS 安全整数。 */
interface AvatarConfirm {
  ossId: string;
}

/** 返回值，对齐后端 updateMyAvatarResult。 */
interface UpdateMyAvatarResult {
  error?: string;
  cancelled?: boolean;
  message?: string;
  avatarUrl?: string;
}

const props = defineProps<{
  status?: string;
  /** respond 之后、后端结果到达之前，渲染器会把 result 临时设成回传的 ResumeEntry 数组。 */
  result?: UpdateMyAvatarResult | ResumeEntry[];
  respond?: (response: ResumeEntry[]) => void;
}>();

/** 与后端 avatarSuffixes 一致；不含 svg。 */
const SUFFIXES = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
const ACCEPT = SUFFIXES.map((s) => `.${s}`).join(',');
const MAX_SIZE_MB = 5;

const userStore = useUserStore();

const done = computed(() =>
  props.status === 'complete' && props.result && !Array.isArray(props.result) ? props.result : undefined,
);
const submitted = computed(() => (Array.isArray(props.result) ? props.result[0]?.status : undefined));

const fileInput = ref<HTMLInputElement | null>(null);
const currentUrl = ref('');
const file = ref<File>();
const previewUrl = ref('');
const hint = ref('');
const uploading = ref(false);
/** 本卡片实例确认过修改。从快照恢复的已完成卡片不该再去改全局头像。 */
const responded = ref(false);

onMounted(async () => {
  // 只有待确认态需要当前头像；已完成的卡片（含刷新后从快照恢复的）不必再查。
  if (done.value || submitted.value) return;
  try {
    const res = await getUserProfile();
    currentUrl.value = res?.data?.user?.avatarUrl ?? '';
  } catch {
    // 错误提示由 request 拦截器统一弹出；拿不到当前头像时只展示新图
  }
});

// 修改成功后同步顶栏头像：结果里的 avatarUrl 就是新头像的可访问地址。
watch(done, (r) => {
  if (responded.value && r && !r.error && !r.cancelled && r.avatarUrl) {
    userStore.setAvatar(r.avatarUrl);
  }
});

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const f = target.files?.[0];
  target.value = '';
  if (!f) return;
  const suffix = f.name.split('.').pop()?.toLowerCase() ?? '';
  if (!SUFFIXES.includes(suffix)) {
    hint.value = '仅支持 png、jpg、gif、webp、bmp 格式图片';
    return;
  }
  if (f.size > MAX_SIZE_MB * 1024 * 1024) {
    hint.value = `图片不能超过 ${MAX_SIZE_MB}MB`;
    return;
  }
  hint.value = '';
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  file.value = f;
  previewUrl.value = URL.createObjectURL(f);
}

async function confirm() {
  if (!file.value) return;
  uploading.value = true;
  try {
    const form = new FormData();
    form.append('file', file.value, file.value.name);
    const res = await uploadOss(form);
    const ossId = String(res?.data?.ossId ?? '');
    if (!ossId) {
      hint.value = '图片上传失败，请重试';
      return;
    }
    const payload: AvatarConfirm = { ossId };
    responded.value = true;
    props.respond?.([{ status: 'resolved', payload }]);
  } catch {
    // 错误提示由 request 拦截器统一弹出，留在待确认态可重试
  } finally {
    uploading.value = false;
  }
}

function cancel() {
  props.respond?.([{ status: 'cancelled' }]);
}
</script>
<style scoped>
.avatars {
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.caption {
  font-size: 12px;
  color: #999;
}
.arrow {
  color: #999;
}
.picker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border: 1px dashed var(--td-component-border);
  border-radius: 50%;
  overflow: hidden;
  font-size: 12px;
  color: #999;
  cursor: pointer;
}
.picker:hover {
  border-color: var(--td-brand-color);
}
.picker img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
