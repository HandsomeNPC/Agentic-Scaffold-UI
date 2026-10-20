<template>
  <div v-if="layout === 'side'" class="header-menu-search">
    <t-auto-complete
      v-model="keyword"
      class="header-search"
      :class="[{ 'hover-active': isSearchFocus }]"
      :options="menuOptions"
      :placeholder="t('layout.searchPlaceholder')"
      clearable
      filterable
      @blur="changeSearchFocus(false)"
      @focus="changeSearchFocus(true)"
      @select="onSelect"
    >
      <template #prefix-icon>
        <t-icon class="icon" name="search" size="16" />
      </template>
    </t-auto-complete>
  </div>

  <div v-else class="header-menu-search-left">
    <t-button
      :class="{ 'search-icon-hide': isSearchFocus }"
      theme="default"
      shape="square"
      variant="text"
      @click="changeSearchFocus(true)"
    >
      <t-icon name="search" />
    </t-button>
    <t-auto-complete
      v-model="keyword"
      class="header-search"
      :class="[{ 'width-zero': !isSearchFocus }]"
      :options="menuOptions"
      :placeholder="t('layout.search.placeholder')"
      :autofocus="isSearchFocus"
      clearable
      filterable
      @blur="changeSearchFocus(false)"
      @select="onSelect"
    >
      <template #prefix-icon>
        <t-icon name="search" size="16" />
      </template>
    </t-auto-complete>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { t } from '@/locales';
import { useLocale } from '@/locales/useLocale';
import { usePermissionStore } from '@/store';
import { isHttp } from '@/utils/ruoyi';

defineProps({
  layout: {
    type: String,
    default: '',
  },
});

const router = useRouter();
const { locale } = useLocale();
const permissionStore = usePermissionStore();

const isSearchFocus = ref(false);
const keyword = ref('');

const changeSearchFocus = (value: boolean) => {
  if (!value) {
    keyword.value = '';
  }
  isSearchFocus.value = value;
};

interface FlatMenu {
  label: string;
  value: string;
}

// 扁平化动态路由，跳过隐藏/外链，解析 meta.title 为当前 locale 文案
const flatten = (routes: any[], acc: FlatMenu[] = []): FlatMenu[] => {
  routes.forEach((r) => {
    if (!r) return;
    if (r.meta?.hidden) return;
    const path = String(r.path || '');
    const title = r.meta?.title;
    let label = '';
    if (title) {
      label = typeof title === 'string' ? title : title[locale.value as keyof typeof title] || '';
    }
    if (label && path && !isHttp(path)) {
      acc.push({ label, value: path });
    }
    if (r.children?.length) flatten(r.children, acc);
  });
  return acc;
};

const menuOptions = computed(() => flatten(permissionStore.routers));

const onSelect = (val: string) => {
  if (!val) return;
  router.push(val).finally(() => {
    keyword.value = '';
  });
};
</script>
<style lang="less" scoped>
.header-menu-search {
  display: flex;
  margin-left: 16px;

  .hover-active {
    background: var(--td-bg-color-secondarycontainer);
  }

  .t-icon {
    color: var(--td-text-color-primary) !important;
  }

  .header-search {
    :deep(.t-input) {
      border: none;
      outline: none;
      box-shadow: none;
      transition: background @anim-duration-base linear;

      .t-input__inner {
        transition: background @anim-duration-base linear;
        background: none;
      }

      &:hover {
        background: var(--td-bg-color-secondarycontainer);

        .t-input__inner {
          background: var(--td-bg-color-secondarycontainer);
        }
      }
    }
  }
}

.t-button {
  margin: 0 8px;
  transition: opacity @anim-duration-base @anim-time-fn-easing;

  .t-icon {
    font-size: 20px;

    &.general {
      margin-right: 16px;
    }
  }
}

.search-icon-hide {
  opacity: 0;
}

.header-menu-search-left {
  display: flex;
  align-items: center;

  .header-search {
    width: 200px;
    transition: width @anim-duration-base @anim-time-fn-easing;

    :deep(.t-input) {
      border: 0;

      &:focus {
        box-shadow: none;
      }
    }

    &.width-zero {
      width: 0;
      opacity: 0;
    }
  }
}
</style>
