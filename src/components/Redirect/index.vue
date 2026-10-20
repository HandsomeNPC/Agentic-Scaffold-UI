<template>
  <div />
</template>

<script lang="ts" setup>
import { onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';

defineOptions({ name: 'Redirect' });

const route = useRoute();
const router = useRouter();

onBeforeMount(() => {
  const { params, query } = route;
  const seg = params.path;
  const targetPath = '/' + (Array.isArray(seg) ? seg.join('/') : (seg ?? ''));
  router.replace({ path: targetPath, query });
});
</script>
