<template>
  <t-select
    :loading="loading"
    :options="options"
    :value="modelValue"
    clearable
    filterable
    v-bind="$attrs"
    @update:value="(v: any) => emit('update:modelValue', v)"
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useDict } from '@/utils/dict';

interface Props {
  /** 字典类型 */
  type: string;
  modelValue?: number | string | Array<number | string>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: number | string | Array<number | string>): void;
}>();

const dicts = useDict(props.type);
const loading = computed(() => !(dicts[props.type] && dicts[props.type].length));
const options = computed(() => (dicts[props.type] || []).map((d) => ({ label: d.label, value: d.value })));
</script>
