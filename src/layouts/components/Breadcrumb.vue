<template>
  <t-breadcrumb max-item-width="150" class="tdesign-breadcrumb">
    <t-breadcrumbItem v-for="item in crumbs" :key="item.to" :to="item.to">
      {{ item.title }}
    </t-breadcrumbItem>
  </t-breadcrumb>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import type { LocalizedTitle } from '@/locales';
import { useLocale } from '@/locales/useLocale';

const { locale } = useLocale();
const route = useRoute();

const renderTitle = (title?: LocalizedTitle, fallback?: string) => {
  if (!title) return fallback || '';
  if (typeof title === 'string') return title;
  return title[locale.value as keyof LocalizedTitle] || fallback || '';
};

// 直接基于 route.matched 构建：Vue Router 已按层级填充 matched，
// 避免原来按 path 段 + matched[idx] 索引在深嵌套/带参路由下错位。
const crumbs = computed(() =>
  (route.matched || [])
    .filter((m) => !m.meta?.hiddenBreadcrumb && m.meta?.title)
    .map((m) => ({
      to: m.path,
      title: renderTitle(m.meta.title as LocalizedTitle),
    })),
);
</script>
<style scoped>
.tdesign-breadcrumb {
  margin-bottom: 24px;
}
</style>
