<template>
  <div class="tree-panel">
    <div v-if="title || searchable" class="tree-panel__head">
      <div v-if="title" class="tree-panel__title">{{ title }}</div>
      <t-input v-if="searchable" v-model="filter" :placeholder="searchPlaceholder" clearable @change="onFilterChange">
        <template #prefix-icon><t-icon name="search" /></template>
      </t-input>
      <div v-if="searchable" class="tree-panel__toggle">
        <t-button size="small" theme="primary" variant="text" @click="expandAll">展开全部</t-button>
        <t-button size="small" theme="primary" variant="text" @click="foldAll">折叠全部</t-button>
      </div>
    </div>
    <div class="tree-panel__body">
      <t-tree
        ref="treeRef"
        :data="filteredData"
        :keys="mergedKeys"
        :value="activeValues"
        activable
        expand-all
        hover
        @active-change="onActiveChange"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

interface TreePanelKeys {
  label: string;
  value: string;
  children: string;
}

interface TreeNodeData {
  [key: string]: any;
}

defineOptions({ name: 'TreePanel' });

const props = withDefaults(
  defineProps<{
    /** 树数据（已组装为树形结构，字段名由 keys 指定，默认 label/value/children） */
    treeData: TreeNodeData[];
    /** 字段映射，默认 { label: 'label', value: 'value', children: 'children' } */
    keys?: Partial<TreePanelKeys>;
    title?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    /** 当前激活节点值（v-model） */
    modelValue?: string | number;
  }>(),
  {
    treeData: () => [],
    keys: () => ({}),
    title: '',
    searchable: true,
    searchPlaceholder: '关键字',
    modelValue: undefined,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: string | number | undefined): void;
  (e: 'active-change', id: string | number | undefined, node: TreeNodeData | undefined): void;
}>();

const mergedKeys = computed<TreePanelKeys>(() => ({
  label: props.keys.label || 'label',
  value: props.keys.value || 'value',
  children: props.keys.children || 'children',
}));

const treeRef = ref();
const filter = ref('');

/** t-tree activable 的 value 是激活值数组 */
const activeValues = computed<Array<string | number>>(() =>
  props.modelValue !== undefined && props.modelValue !== null ? [props.modelValue] : [],
);

/** 前端关键字递归过滤：保留命中节点及其祖先链 */
const filterNodes = (nodes: TreeNodeData[], kw: string): TreeNodeData[] => {
  const labelKey = mergedKeys.value.label;
  const childrenKey = mergedKeys.value.children;
  const res: TreeNodeData[] = [];
  nodes.forEach((n) => {
    const children = n[childrenKey]?.length ? filterNodes(n[childrenKey], kw) : [];
    if (
      String(n[labelKey] ?? '')
        .toLowerCase()
        .includes(kw) ||
      children.length
    ) {
      res.push({ ...n, [childrenKey]: children.length ? children : n[childrenKey] });
    }
  });
  return res;
};

const filteredData = computed<TreeNodeData[]>(() => {
  const kw = filter.value.trim().toLowerCase();
  if (!kw) return props.treeData;
  return filterNodes(props.treeData, kw);
});

const onFilterChange = () => {
  // t-tree 数据驱动，过滤后默认折叠；重新展开
  if (filter.value) expandAll();
};

const onActiveChange = (vals: Array<string | number>, context: any) => {
  const id = vals?.[0];
  emit('update:modelValue', id);
  emit('active-change', id, context?.node);
};

const expandAll = () => treeRef.value?.expandAll?.();
const foldAll = () => treeRef.value?.foldAll?.();

defineExpose({ expandAll, foldAll });
</script>

<style lang="less" scoped>
.tree-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tree-panel__title {
  font-weight: 600;
  color: var(--td-text-color-primary);
}
.tree-panel__toggle {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
.tree-panel__body {
  max-height: 600px;
  overflow: auto;
}
</style>
