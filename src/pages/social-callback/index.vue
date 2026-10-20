<template>
  <div class="social-callback">
    <t-loading v-if="loading" size="large" text="正在处理第三方登录..." />
  </div>
</template>

<script lang="ts" setup>
import { MessagePlugin } from 'tdesign-vue-next';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import type { LoginData } from '@/api/types';
import { callback, login } from '@/api/login';
import { useUserStore } from '@/store';
import { getToken, setToken } from '@/utils/auth';

defineOptions({ name: 'SocialCallback' });

const route = useRoute();
const loading = ref(true);
const userStore = useUserStore();

const code = route.query.code as string;
const state = route.query.state as string;
const source = route.query.source as string;

const goHome = () => {
  setTimeout(() => {
    location.href = (import.meta.env.VITE_APP_CONTEXT_PATH || '/') + 'index';
  }, 1500);
};

const process = async (res: any) => {
  if (res?.code !== 200) {
    throw new Error(res?.msg || '登录失败');
  }
  if (res?.data?.access_token) {
    setToken(res.data.access_token);
    userStore.token = res.data.access_token;
  }
  MessagePlugin.success(res?.msg || '登录成功');
  goHome();
};

const fail = (error: any) => {
  MessagePlugin.error(error?.message || '登录失败');
  goHome();
};

const init = async () => {
  const data: LoginData = {
    socialCode: code,
    socialState: state,
    source,
    clientId: import.meta.env.VITE_APP_CLIENT_ID,
    grantType: 'social',
  } as LoginData;
  try {
    if (!getToken()) {
      // 未登录 → 三方登录拿 token
      const res = await login(data);
      await process(res);
    } else {
      // 已登录 → 绑定三方账号
      const res = await callback(data);
      await process(res);
    }
    loading.value = false;
  } catch (error) {
    fail(error);
  }
};

onMounted(init);
</script>

<style scoped>
.social-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}
</style>
