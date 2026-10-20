<template>
  <span v-if="!values.length">{{ unmatch && showValue ? unmatchText : '' }}</span>
  <t-space v-else :size="4" break-line>
    <template v-for="item in matched" :key="item.value">
      <t-tag
        v-if="hasTagTheme(item.elTagType)"
        :class="item.elTagClass"
        :theme="tagTheme(item.elTagType)"
        variant="light-outline"
      >
        {{ item.label }}
      </t-tag>
      <span v-else :class="item.elTagClass">{{ item.label + ' ' }}</span>
    </template>
    <span v-if="unmatch && showValue" class="dict-tag-unmatch">{{ unmatchText }}</span>
  </t-space>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

interface Props {
  options: DictDataOption[];
  value: number | string | Array<number | string>;
  showValue?: boolean;
  separator?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showValue: true,
  separator: ',',
});

const values = computed<string[]>(() => {
  const v = props.value;
  if (v === '' || v === null || typeof v === 'undefined') return [];
  if (typeof v === 'number' || typeof v === 'boolean') return ['' + v];
  return Array.isArray(v) ? v.map((item) => '' + item) : String(v).split(props.separator);
});

const matched = computed<DictDataOption[]>(() => {
  return values.value.map((val) => props.options.find((o) => '' + o.value === val)).filter(Boolean) as DictDataOption[];
});

const unmatch = computed(() => matched.value.length < values.value.length);

const unmatchText = computed(() =>
  values.value.filter((val) => !props.options.some((o) => '' + o.value === val)).join(props.separator),
);

const THEMES = ['primary', 'success', 'warning', 'danger', 'info', 'default'];
const hasTagTheme = (t?: string) => !!t && THEMES.includes(t);
const tagTheme = (t?: string): any => (t === 'info' || !t ? 'default' : t);
</script>

<style scoped>
.dict-tag-unmatch {
  color: var(--td-text-color-secondary);
}
</style>
