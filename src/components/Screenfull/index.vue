<template>
  <t-tooltip :content="isFullscreen ? '退出全屏' : '全屏'" placement="bottom">
    <t-button shape="square" theme="default" variant="text" @click="toggle">
      <t-icon :name="isFullscreen ? 'fullscreen-exit' : 'fullscreen'" />
    </t-button>
  </t-tooltip>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineOptions({ name: 'Screenfull' });

const isFullscreen = ref(false);

const update = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

const toggle = () => {
  const el: any = document.documentElement;
  if (!document.fullscreenElement) {
    el.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', update);
});
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', update);
});
</script>
