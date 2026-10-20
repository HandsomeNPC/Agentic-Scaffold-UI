<template>
  <div />
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { MessagePlugin } from 'tdesign-vue-next';

const router = useRouter();

/**
 * 后端隐藏菜单 tool/gen/editTable 的桩页面。
 * 代码生成「编辑」在新版里改为页内弹窗（见 pages/tool/gen/index.vue），
 * 不再有独立编辑页；该路由仅由后端菜单数据携带，直接访问时回到生成器列表。
 */
onMounted(() => {
  MessagePlugin.info('请在代码生成列表中点击「编辑」进行配置');
  router.replace('/tool/gen');
});
</script>
