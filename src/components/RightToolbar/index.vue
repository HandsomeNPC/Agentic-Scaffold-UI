<template>
  <div class="right-toolbar">
    <t-space size="small">
      <t-tooltip v-if="search" :content="showSearch ? '隐藏搜索' : '显示搜索'" placement="bottom">
        <t-button shape="square" theme="default" variant="text" @click="toggleSearch">
          <template #icon><search-icon /></template>
        </t-button>
      </t-tooltip>
      <t-tooltip content="刷新" placement="bottom">
        <t-button shape="square" theme="default" variant="text" @click="refresh">
          <template #icon><refresh-icon /></template>
        </t-button>
      </t-tooltip>
      <t-popup
        v-if="colTreeData.length"
        overlay-class-name="right-toolbar-col-popup"
        placement="bottom"
        trigger="click"
      >
        <template #content>
          <div class="col-tree-header">显示/隐藏列</div>
          <t-tree
            v-model="visibleColKeys"
            :data="colTreeData"
            :keys="{ label: 'label', value: 'value', children: 'children' }"
            checkable
            expand-all
            @change="onColChange"
          />
        </template>
        <t-tooltip content="显示/隐藏列" placement="bottom">
          <t-button shape="square" theme="default" variant="text">
            <template #icon><setting-icon /></template>
          </t-button>
        </t-tooltip>
      </t-popup>
    </t-space>
  </div>
</template>

<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { RefreshIcon, SearchIcon, SettingIcon } from 'tdesign-icons-vue-next';
import { computed, onMounted, ref, watch } from 'vue';

import cache from '@/plugins/cache';

interface ColNode {
  label: string;
  value: string;
  children?: ColNode[];
}

const props = withDefaults(
  defineProps<{
    /** 搜索区是否显示（v-model:showSearch） */
    showSearch?: boolean;
    /** 可控列；带 visible 标记的列会被纳入显隐树 */
    columns?: PrimaryTableCol[];
    /** 是否显示「隐藏/显示搜索」按钮 */
    search?: boolean;
    /** 持久化列显隐的缓存 key */
    storageKey?: string;
  }>(),
  {
    showSearch: true,
    columns: () => [],
    search: true,
    storageKey: '',
  },
);

const emit = defineEmits<{
  (e: 'update:showSearch', val: boolean): void;
  (e: 'queryTable'): void;
}>();

// 不参与显隐控制的列（行选择 / 操作列）
const isControlCol = (col: PrimaryTableCol) => {
  const k = String(col.colKey ?? '');
  return !k || k === 'row-select' || k === 'operation';
};

const colTreeData = computed<ColNode[]>(() =>
  (props.columns || [])
    .filter((c) => !isControlCol(c) && c.title)
    .map((c) => ({ label: String(c.title), value: String(c.colKey) })),
);

const visibleColKeys = ref<Array<string | number>>([]);

const syncVisibleKeys = () => {
  visibleColKeys.value = (props.columns || [])
    .filter((c) => !isControlCol(c) && (c as any).visible !== false && c.colKey)
    .map((c) => String(c.colKey));
};

const applyStored = () => {
  if (!props.storageKey) return;
  const stored = cache.local.getJSON(props.storageKey);
  if (!stored || typeof stored !== 'object') return;
  (props.columns || []).forEach((c) => {
    const k = String(c.colKey ?? '');
    if (k && k in stored) (c as any).visible = !!stored[k];
  });
};

const saveStorage = () => {
  if (!props.storageKey) return;
  const map: Record<string, boolean> = {};
  (props.columns || []).forEach((c) => {
    const k = String(c.colKey ?? '');
    if (k && !isControlCol(c)) map[k] = (c as any).visible !== false;
  });
  cache.local.setJSON(props.storageKey, map);
};

const onColChange = (keys: Array<string | number>) => {
  const set = new Set(keys.map(String));
  (props.columns || []).forEach((c) => {
    const k = String(c.colKey ?? '');
    if (k && !isControlCol(c)) (c as any).visible = set.has(k);
  });
  saveStorage();
};

const toggleSearch = () => emit('update:showSearch', !props.showSearch);
const refresh = () => emit('queryTable');

watch(
  () => props.columns,
  () => syncVisibleKeys(),
  { deep: false, immediate: false },
);

onMounted(() => {
  applyStored();
  syncVisibleKeys();
});
</script>

<style lang="less" scoped>
.right-toolbar {
  display: inline-flex;
  align-items: center;
}
.col-tree-header {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-bottom: 8px;
}
</style>

<style lang="less">
// popup 内容需要用非 scoped 样式（t-popup 内容渲染在 body 下）
.right-toolbar-col-popup .t-popup__content {
  width: 200px;
}
</style>
