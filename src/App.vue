<template>
  <t-config-provider :global-config="getComponentsLocale">
    <router-view :key="locale" :class="[mode]" />
  </t-config-provider>
</template>
<script setup lang="ts">
import { computed, onMounted } from 'vue';

import { useLayoutSize } from '@/hooks/useLayoutSize';
import { useLocale } from '@/locales/useLocale';
import { useSettingStore } from '@/store';

const store = useSettingStore();

const mode = computed(() => {
  return store.displayMode;
});

const { getComponentsLocale, locale } = useLocale();

// 在根组件恢复布局大小，不放在顶栏的下拉里：顶栏可以被隐藏，隐藏后刷新就丢了。
const { restoreLayoutSize } = useLayoutSize();
onMounted(restoreLayoutSize);
</script>
<style lang="less" scoped>
#nprogress .bar {
  background: var(--td-brand-color) !important;
}
</style>
