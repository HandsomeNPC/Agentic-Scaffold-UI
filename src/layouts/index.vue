<template>
  <div class="layout-root">
    <template v-if="setting.layout.value === 'side'">
      <t-layout key="side" :class="mainLayoutCls">
        <t-aside><layout-side-nav /></t-aside>
        <t-layout>
          <t-header><layout-header /></t-header>
          <t-content><layout-content /></t-content>
        </t-layout>
      </t-layout>
    </template>

    <template v-else>
      <t-layout key="no-side">
        <t-header><layout-header /> </t-header>
        <t-layout :class="mainLayoutCls">
          <layout-side-nav />
          <layout-content />
        </t-layout>
      </t-layout>
    </template>
    <setting-com />
    <agent-side-bar />
  </div>
</template>
<script setup lang="ts">
import '@/style/layout.less';

import { storeToRefs } from 'pinia';
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

import { AgentSideBar } from '@/agent';
import { prefix } from '@/config/global';
import { useSettingStore, useTabsRouterStore } from '@/store';

import LayoutContent from './components/LayoutContent.vue';
import LayoutHeader from './components/LayoutHeader.vue';
import LayoutSideNav from './components/LayoutSideNav.vue';
import SettingCom from './setting.vue';

const route = useRoute();
const settingStore = useSettingStore();
const tabsRouterStore = useTabsRouterStore();
const setting = storeToRefs(settingStore);

const mainLayoutCls = computed(() => [
  {
    't-layout--with-sider': settingStore.showSidebar,
  },
]);

const appendNewRoute = () => {
  const {
    path,
    query,
    meta: { title },
    name,
  } = route;
  const titleObj = typeof title === 'string' ? { zh_CN: title, en_US: title } : title;
  tabsRouterStore.appendTabRouterList({ path, query, title: titleObj, name, isAlive: true, meta: route.meta });
};

onMounted(() => {
  appendNewRoute();
});

watch(
  () => route.path,
  () => {
    appendNewRoute();
    document.querySelector(`.${prefix}-layout`)?.scrollTo({ top: 0, behavior: 'smooth' });
  },
);
</script>
<style lang="less" scoped>
// 智能助手侧边栏打开时给页面让出右侧空间（变量由 AgentSideBar 维护）
.layout-root {
  padding-right: var(--agent-sidebar-width, 0);
  transition: padding-right 0.3s;
}
</style>
