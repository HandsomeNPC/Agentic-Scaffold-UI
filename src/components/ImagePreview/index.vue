<template>
  <span :style="wrapStyle" class="image-preview">
    <t-image-viewer v-if="src && !broken" :default-index="0" :images="images">
      <template #trigger="{ open }">
        <img :alt="alt" :src="src" :style="imgStyle" class="image-preview__img" @click="open" @error="onError" />
      </template>
    </t-image-viewer>
    <span v-else :style="imgStyle" class="image-preview__fallback">
      <t-icon name="image" />
    </span>
  </span>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

defineOptions({ name: 'ImagePreview' });

const props = withDefaults(
  defineProps<{
    src: string;
    alt?: string;
    fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    width?: number | string;
    height?: number | string;
    radius?: number | string;
  }>(),
  {
    src: '',
    alt: '',
    fit: 'cover',
    width: 60,
    height: 60,
    radius: 4,
  },
);

const broken = ref(false);
const onError = () => {
  broken.value = true;
};

const toSize = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);

const imgStyle = computed(() => ({
  width: toSize(props.width),
  height: toSize(props.height),
  objectFit: props.fit,
  borderRadius: toSize(props.radius),
  cursor: 'pointer',
}));
const wrapStyle = computed(() => ({
  display: 'inline-flex',
  width: toSize(props.width),
  height: toSize(props.height),
}));

const images = computed(() => (props.src ? [props.src] : []));
</script>

<style lang="less" scoped>
.image-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &__img {
    display: block;
  }

  &__fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--td-bg-color-secondarycontainer);
    color: var(--td-text-color-placeholder);
    border-radius: inherit;
  }
}
</style>
