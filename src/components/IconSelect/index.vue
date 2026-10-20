<template>
  <t-popup v-model:visible="visible" :overlay-style="{ width: '360px' }" placement="bottom-left" trigger="click">
    <template #content>
      <div class="icon-picker">
        <t-input v-model="filter" clearable placeholder="搜索图标名称" size="small">
          <template #prefix-icon><t-icon name="search" /></template>
        </t-input>
        <div class="icon-scroll">
          <div class="icon-grid">
            <div
              v-for="name in filtered"
              :key="name"
              :class="{ active: name === modelValue }"
              :title="name"
              class="icon-cell"
              @click="pick(name)"
            >
              <svg-icon :icon-class="name" />
            </div>
          </div>
        </div>
      </div>
    </template>
    <t-input :value="modelValue" clearable placeholder="点击选择图标" readonly @clear="pick('')">
      <template #prefix-icon>
        <svg-icon v-if="modelValue" :icon-class="modelValue" />
        <t-icon v-else name="image" />
      </template>
    </t-input>
  </t-popup>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

interface Props {
  modelValue?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

// 收集 src/assets/icons/svg 下所有图标名（与 createSvgIconsPlugin sprite 一致）
const modules = import.meta.glob('@/assets/icons/svg/*.svg');
const iconNames = Object.keys(modules)
  .map((k) => k.match(/\/([^/]+)\.svg$/)?.[1])
  .filter(Boolean) as string[];

const visible = ref(false);
const filter = ref('');

const filtered = computed(() => {
  const kw = filter.value.trim().toLowerCase();
  if (!kw) return iconNames;
  return iconNames.filter((n) => n.toLowerCase().includes(kw));
});

const pick = (name: string) => {
  emit('update:modelValue', name);
  visible.value = false;
};
</script>

<style scoped>
.icon-picker {
  width: 332px;
}
.icon-scroll {
  max-height: 260px;
  margin-top: 8px;
}
.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}
.icon-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  font-size: 18px;
  border-radius: var(--td-radius-default);
  cursor: pointer;
  color: var(--td-text-color-primary);
}
.icon-cell:hover {
  background: var(--td-bg-color-container-hover);
}
.icon-cell.active {
  background: var(--td-brand-color-light);
  color: var(--td-brand-color);
}
</style>
