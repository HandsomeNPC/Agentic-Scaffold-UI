<template>
  <div class="inner-link-wrap">
    <iframe v-if="src" :src="src" class="inner-link-iframe" frameborder="0" />
    <t-empty v-else description="未配置外链地址" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

defineOptions({ name: 'InnerLink' });

const route = useRoute();
const src = computed(() => (route.meta.link as string) || (route.meta.frameSrc as string) || '');
</script>

<style lang="less" scoped>
.inner-link-wrap {
  width: 100%;
  height: calc(100vh - 120px);
}
.inner-link-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
