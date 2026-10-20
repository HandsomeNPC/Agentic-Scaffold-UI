<template>
  <div class="page-401">
    <div class="content">
      <t-icon class="icon" name="lock-on" />
      <h1 class="code">401</h1>
      <p class="desc">抱歉，您没有访问该页面的权限</p>
      <t-space>
        <t-button theme="primary" @click="goHome">返回首页</t-button>
        <t-button theme="default" variant="outline" @click="goBack">返回上一页</t-button>
      </t-space>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';

defineOptions({ name: 'Error401' });

const router = useRouter();
const goHome = () => router.push('/');
const goBack = () => router.go(-1);
</script>

<style lang="less" scoped>
.page-401 {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80vh;
  text-align: center;
}
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.icon {
  font-size: 64px;
  color: var(--td-warning-color);
}
.code {
  font-size: 72px;
  font-weight: 700;
  margin: 0;
  color: var(--td-text-color-primary);
}
.desc {
  color: var(--td-text-color-secondary);
}
</style>
