<template>
  <div>
    <template v-for="item in list" :key="item.path">
      <!-- 外链：window.open 打开，不走路由 -->
      <t-menu-item v-if="item.isExternal" :name="item.path" :value="getPath(item)" @click="openHref(item.href)">
        <template #icon>
          <component :is="menuIcon(item)" class="t-icon"></component>
        </template>
        {{ renderMenuTitle(item.title) }}
      </t-menu-item>

      <!-- 叶子节点（含单子节点提升）：路由跳转 -->
      <t-menu-item
        v-else-if="!item.children || !item.children.length || item.single"
        :name="item.path"
        :to="toLocation(item)"
        :value="getPath(item)"
      >
        <template #icon>
          <component :is="menuIcon(item)" class="t-icon"></component>
        </template>
        {{ renderMenuTitle(item.title) }}
      </t-menu-item>

      <!-- 父级：子菜单递归 -->
      <t-submenu v-else :name="item.path" :value="item.path" :title="renderMenuTitle(item.title)">
        <template #icon>
          <component :is="menuIcon(item)" class="t-icon"></component>
        </template>
        <menu-content v-if="item.children" :nav-data="item.children" />
      </t-submenu>
    </template>
  </div>
</template>
<script setup lang="tsx">
import type { PropType } from 'vue';
import { computed, h } from 'vue';

import SvgIcon from '@/components/SvgIcon/index.vue';
import type { LocalizedTitle } from '@/locales';
import { useLocale } from '@/locales/useLocale';
import { getActive } from '@/router';
import { getNormalPath, isExternal } from '@/utils/ruoyi';
import type { MenuRoute } from '@/types/interface';

type ListItemType = MenuRoute;

const { navData } = defineProps({
  navData: {
    type: Array as PropType<MenuRoute[]>,
    default: () => [],
  },
});

const active = computed(() => getActive());

const { locale } = useLocale();

const list = computed(() => {
  return getMenuList(navData);
});

const menuIcon = (item: ListItemType) => {
  if (typeof item.icon === 'string') return h(SvgIcon, { iconClass: item.icon });
  return item.icon ?? null;
};

const renderMenuTitle = (title?: LocalizedTitle) => {
  if (!title) return '';
  return title[locale.value as keyof LocalizedTitle] || '';
};

/**
 * 把后端路由树整理成侧边栏菜单：
 *  - 过滤 hidden
 *  - 按 meta.orderNo 排序
 *  - 解析 meta.query（后端 JSON 字符串）
 *  - 识别外链（isExternal(path) / meta.link / meta.frameSrc）
 *  - 单可见子节点提升（沿用原项目 hasOneShowingChild）：父级只有一个叶子子节点时，
 *    把它提升为单项显示，父级 meta 为空（如 AI会话）也能正常渲染。
 */
function getMenuList(source: MenuRoute[], basePath?: string): MenuRoute[] {
  if (!source || source.length === 0) {
    return [];
  }
  const sorted = [...source].sort((a, b) => {
    return ((a.meta?.orderNo as number) || 0) - ((b.meta?.orderNo as number) || 0);
  });

  const result: MenuRoute[] = [];
  sorted.forEach((item) => {
    if (item.meta?.hidden === true) return;

    const itemPath = String(item.path ?? '');
    // 外链判定：仅 path 本身是 http(s):// 才用 window.open；
    // meta.link 也存在于「内链」菜单（component=InnerLink，path 是普通路由），
    // 内链应走路由由 InnerLink 组件在系统内渲染 iframe，不能当外链处理。
    const external = isExternal(itemPath);
    const resolvedPath = external
      ? itemPath
      : basePath && !itemPath.includes(basePath)
        ? getNormalPath(`${basePath}/${itemPath}`)
        : getNormalPath(itemPath);

    // 解析后端 meta.query（JSON 字符串）为对象
    let query: Record<string, any> | undefined;
    const rawQuery = item.meta?.query as any;
    if (rawQuery && typeof rawQuery === 'string') {
      try {
        query = JSON.parse(rawQuery);
      } catch {
        query = undefined;
      }
    } else if (rawQuery && typeof rawQuery === 'object') {
      query = rawQuery;
    }

    const children = getMenuList(item.children, resolvedPath);
    const hasChildren = children && children.length > 0;

    const node: MenuRoute = {
      path: resolvedPath,
      title: (item.meta?.title as LocalizedTitle | undefined) ?? (item.title as LocalizedTitle | undefined),
      icon: (item.meta?.icon as any) ?? item.icon,
      children,
      meta: item.meta,
      redirect: item.redirect,
      query,
      isExternal: external,
      href: external ? itemPath : undefined,
    };

    // 单可见子节点提升：父级只有一个叶子子节点、且未声明 alwaysShow 时，提升为单项
    if (
      !external &&
      !item.meta?.alwaysShow &&
      hasChildren &&
      children.length === 1 &&
      (!children[0].children || children[0].children.length === 0)
    ) {
      const only = children[0];
      result.push({
        ...only,
        // 父级图标作为兜底
        icon: only.icon || node.icon,
        title: only.title || node.title,
        single: true,
      });
      return;
    }

    result.push(node);
  });
  return result;
}

/** t-menu-item 的路由跳转目标：有 query 时用对象形式 */
const toLocation = (item: ListItemType): any => {
  if (item.query && Object.keys(item.query).length) {
    return { path: item.path, query: item.query };
  }
  return item.path;
};

const getPath = (item: ListItemType) => {
  const activeLevel = active.value.split('/').length;
  const pathLevel = String(item.path).split('/').length;
  if (activeLevel > pathLevel && active.value.startsWith(item.path)) {
    return active.value;
  }

  if (active.value === item.path) {
    return active.value;
  }

  return item.meta?.single ? item.redirect : item.path;
};

const openHref = (url?: string) => {
  if (url) window.open(url);
};
</script>
