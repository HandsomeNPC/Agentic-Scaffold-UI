<template>
  <div class="ai-chat-page">
    <t-loading v-if="loading" class="chat-loading" size="large" text="正在加载 Snail AI..." />
    <iframe
      v-else-if="chatUrl"
      :src="chatUrl"
      allow="clipboard-read; clipboard-write"
      class="chat-frame"
      title="Snail AI"
    />
    <t-empty v-else :description="loadError || '正在加载 Snail AI'" class="chat-empty">
      <template #action>
        <t-button v-if="loadError" theme="primary" @click="loadChat">重新加载</t-button>
      </template>
    </t-empty>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { registerCurrentSnailUser } from '@/api/ai/agent';
import { getToken } from '@/utils/auth';

defineOptions({ name: 'AiChat' });

const chatUrl = ref('');
const loadError = ref('');
const loading = ref(false);
const baseUrl = import.meta.env.VITE_APP_BASE_API;

function buildChatUrl(openId: string, trustedCredential: string) {
  const params = new URLSearchParams({ openId, trustedCredential });
  return `${baseUrl}/snail-chat/?${params.toString()}`;
}

async function loadChat() {
  loading.value = true;
  loadError.value = '';
  try {
    const token = getToken();
    if (!token) {
      loadError.value = '登录凭证不存在，请重新登录后再试';
      return;
    }
    const res = await registerCurrentSnailUser();
    const user = res?.data;
    if (!user?.openId) {
      loadError.value = '获取 AI 用户身份失败';
      return;
    }
    chatUrl.value = buildChatUrl(user.openId, token);
  } catch {
    loadError.value = '加载 AI 聊天失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

onMounted(loadChat);
</script>

<style lang="less" scoped>
.ai-chat-page {
  height: calc(100vh - 123px);
  min-height: 0;
  margin: 16px;
  border-radius: var(--td-radius-default);
  overflow: hidden;
}
.chat-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.chat-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
.chat-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
</style>
