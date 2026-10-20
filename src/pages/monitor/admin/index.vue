<template>
  <div class="iframe-page">
    <div class="iframe-page__inner">
      <iframe v-if="src" :src="src" class="iframe-page__frame" frameborder="0" />
      <t-empty v-else description="未配置 Druid 监控地址（VITE_APP_MONITOR_ADMIN）" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

defineOptions({ name: 'MonitorAdmin' });

const src = computed(() => import.meta.env.VITE_APP_MONITOR_ADMIN || '');
</script>

<style lang="less" scoped>
.iframe-page {
  padding: 16px;
}
.iframe-page__inner {
  width: 100%;
  height: calc(100vh - 120px);
  overflow: hidden;
  border-radius: 6px;
  background: var(--td-bg-color-container);
}
.iframe-page__frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>
