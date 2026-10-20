<template>
  <OssConfigPage />
</template>

<script lang="ts" setup>
/**
 * 后端菜单 component 为 `system/oss/config`，而页面实现在 `pages/system/ossConfig/index.vue`。
 * loadView 按后端串精确匹配，路径结构不同（oss/config vs ossConfig）无法桥接，
 * 故在此建一个薄包装，直接复用 ossConfig 页面。
 */
import OssConfigPage from '@/pages/system/ossConfig/index.vue';
</script>
