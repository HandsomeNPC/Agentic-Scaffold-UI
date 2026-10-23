<template>
  <t-dropdown :min-column-width="120" trigger="click" @click="onChange">
    <t-tooltip content="布局大小" placement="bottom">
      <t-button shape="square" theme="default" variant="text">
        <t-icon name="size-change" />
      </t-button>
    </t-tooltip>
    <template #dropdown>
      <t-dropdown-item
        v-for="o in LAYOUT_SIZE_OPTIONS"
        :key="o.value"
        :class="{ 'is-active': layoutSize === o.value }"
        :value="o.value"
      >
        {{ o.label }}
      </t-dropdown-item>
    </template>
  </t-dropdown>
</template>
<script lang="ts" setup>
import { isLayoutSize, LAYOUT_SIZE_OPTIONS, useLayoutSize } from '@/hooks/useLayoutSize';

const { layoutSize, setLayoutSize } = useLayoutSize();

const onChange = (data: any) => {
  if (isLayoutSize(data?.value)) setLayoutSize(data.value);
};
</script>
<style lang="less" scoped>
.is-active {
  :deep(.t-dropdown__item-text) {
    color: var(--td-brand-color);
    font-weight: 600;
  }
}
</style>
