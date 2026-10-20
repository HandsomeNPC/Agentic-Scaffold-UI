<template>
  <div class="user-avatar">
    <div class="avatar-wrap" @click="open">
      <t-avatar :image="img" size="80px" />
      <div class="avatar-mask">修改头像</div>
    </div>

    <t-dialog
      v-model:visible="visible"
      append-to-body
      header="修改头像"
      width="720px"
      @close="onClose"
      @opened="onOpened"
    >
      <t-row :gutter="16">
        <t-col :span="14">
          <div class="cropper-box">
            <vue-cropper
              v-if="cropperVisible"
              ref="cropperRef"
              :auto-crop="options.autoCrop"
              :auto-crop-height="options.autoCropHeight"
              :auto-crop-width="options.autoCropWidth"
              :can-move="options.canMove"
              :can-move-box="options.canMoveBox"
              :center-box="options.centerBox"
              :fixed="options.fixed"
              :fixed-box="options.fixedBox"
              :full="options.full"
              :high="options.high"
              :img="options.img"
              :info="true"
              :output-size="options.outputSize"
              :output-type="options.outputType"
              @real-time="realTime"
            />
          </div>
        </t-col>
        <t-col :span="10">
          <div class="preview-box">
            <div class="preview-title">预览</div>
            <div :style="previews.div" class="preview-circle">
              <img :src="previews.url" :style="previews.img" />
            </div>
          </div>
        </t-col>
      </t-row>
      <div class="cropper-actions">
        <input ref="fileInput" accept="image/*" style="display: none" type="file" @change="onFileChange" />
        <t-space>
          <t-button theme="default" variant="outline" @click="fileInput?.click()">
            <template #icon><upload-icon /></template>选择
          </t-button>
          <t-button theme="default" variant="outline" @click="changeScale(1)">
            <template #icon><add-icon /></template>
          </t-button>
          <t-button theme="default" variant="outline" @click="changeScale(-1)">
            <template #icon><minus-icon /></template>
          </t-button>
          <t-button theme="default" variant="outline" @click="rotateLeft">
            <template #icon><rotate-icon /></template>
          </t-button>
          <t-button theme="default" variant="outline" @click="rotateRight">
            <template #icon><rotate-icon /></template>
          </t-button>
          <t-button :loading="uploading" theme="primary" @click="upload">提 交</t-button>
        </t-space>
      </div>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { VueCropper } from 'vue-cropper';
import 'vue-cropper/dist/index.css';
import { AddIcon, MinusIcon, RotateIcon, UploadIcon } from 'tdesign-icons-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';

import { uploadOss } from '@/api/system/oss';
import { updateUserProfile } from '@/api/system/user';

defineProps<{ img?: string }>();
const emit = defineEmits<{ (e: 'uploaded', url: string): void }>();

const visible = ref(false);
const cropperVisible = ref(false);
const cropperRef = ref<any>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const fileName = ref('');

const options = reactive({
  img: '',
  outputSize: 1,
  outputType: 'png',
  full: false,
  canMove: true,
  canMoveBox: true,
  fixed: true,
  fixedBox: true,
  autoCrop: true,
  autoCropWidth: 200,
  autoCropHeight: 200,
  centerBox: true,
  high: true,
});

const previews = reactive<{ url: string; img: any; div: any }>({ url: '', img: {}, div: {} });

const open = () => {
  options.img = '';
  previews.url = '';
  visible.value = true;
};
const onOpened = () => {
  // 延迟挂载 cropper，确保容器有尺寸
  cropperVisible.value = true;
};
const onClose = () => {
  cropperVisible.value = false;
};

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  if (file.type.indexOf('image') === -1) {
    MessagePlugin.warning('请选择图片文件');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    options.img = String(ev.target?.result ?? '');
    fileName.value = file.name;
  };
  reader.readAsDataURL(file);
  target.value = '';
};

const realTime = (data: any) => {
  previews.url = data?.url ?? '';
  previews.img = data?.img ?? {};
  previews.div = data?.div ?? {};
};

const changeScale = (num: number) => cropperRef.value?.changeScale?.(num);
const rotateLeft = () => cropperRef.value?.rotateLeft?.();
const rotateRight = () => cropperRef.value?.rotateRight?.();

const upload = () => {
  if (!options.img) {
    MessagePlugin.warning('请先选择图片');
    return;
  }
  uploading.value = true;
  cropperRef.value?.getCropBlob?.(async (blob: Blob) => {
    const formData = new FormData();
    formData.append('file', blob, fileName.value || 'avatar.png');
    try {
      // 与原项目一致：先上传 OSS，再把 ossId 写入个人资料
      const res = await uploadOss(formData);
      const uploaded = res?.data;
      if (!uploaded?.ossId) return;
      await updateUserProfile({ avatar: uploaded.ossId });
      emit('uploaded', uploaded.url);
      MessagePlugin.success('修改成功');
      visible.value = false;
    } finally {
      uploading.value = false;
    }
  });
};
</script>

<style lang="less" scoped>
.avatar-wrap {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
  width: 80px;
  height: 80px;
}
.avatar-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 50%;
}
.avatar-wrap:hover .avatar-mask {
  opacity: 1;
}
.cropper-box {
  height: 350px;
}
.preview-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  height: 350px;
  justify-content: center;
}
.preview-title {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
.preview-circle {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--td-component-stroke);
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-circle img {
  width: 100%;
  height: 100%;
}
.cropper-actions {
  margin-top: 16px;
}
</style>
