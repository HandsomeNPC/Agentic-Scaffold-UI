<template>
  <t-dropdown :min-column-width="120" trigger="click" @click="onChange">
    <t-tooltip content="布局大小" placement="bottom">
      <t-button shape="square" theme="default" variant="text">
        <t-icon name="size-change" />
      </t-button>
    </t-tooltip>
    <template #dropdown>
      <t-dropdown-item
        v-for="o in options"
        :key="o.value"
        :class="{ 'is-active': current === o.value }"
        :value="o.value"
      >
        {{ o.label }}
      </t-dropdown-item>
    </template>
  </t-dropdown>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import cache from '@/plugins/cache';

const SIZE_KEY = 'layout-size';
const options = [
  { label: '大', value: 'large' },
  { label: '中', value: 'medium' },
  { label: '小', value: 'small' },
];

const current = ref<string>('medium');

const apply = (val: string) => {
  current.value = val;
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-size', val);
  }
};

const onChange = (data: any) => {
  const val = String(data?.value ?? '');
  if (!val) return;
  apply(val);
  cache.local.set(SIZE_KEY, val);
};

onMounted(() => {
  const saved = cache.local.get(SIZE_KEY);
  apply(saved && options.some((o) => o.value === saved) ? saved : 'medium');
});
</script>

<style lang="less" scoped>
.is-active {
  :deep(.t-dropdown__item-text) {
    color: var(--td-brand-color);
    font-weight: 600;
  }
}
</style>
