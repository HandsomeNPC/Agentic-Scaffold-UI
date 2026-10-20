<template>
  <div class="home-page">
    <!-- Hero -->
    <section class="hero-panel">
      <div class="hero-copy">
        <h1>RuoYi-Vue-Plus 控制台</h1>
        <p>
          企业级后台管理系统，重写 RuoYi-Vue 所有功能，集成 Sa-Token、Mybatis-Plus、WarmFlow、SpringDoc、Hutool、OSS
          等组件。
        </p>
        <div class="hero-actions">
          <t-button theme="primary" @click="goTarget('https://gitee.com/dromara/RuoYi-Vue-Plus')">查看源码</t-button>
          <t-button variant="outline" @click="goTarget('https://plus-doc.dromara.org/#/ruoyi-vue-plus/changlog')">
            更新日志
          </t-button>
        </div>
      </div>
    </section>

    <!-- 项目矩阵 + 能力地图 -->
    <div class="content-grid">
      <t-card :bordered="false" class="section-card">
        <template #title>
          <span class="section-title">项目矩阵</span>
        </template>
        <div class="product-list">
          <article v-for="product in products" :key="product.name" class="product-card">
            <div class="product-top">
              <div>
                <h3>{{ product.name }}</h3>
                <p>{{ product.summary }}</p>
              </div>
              <span class="product-version">{{ product.version }}</span>
            </div>
            <div class="product-tags">
              <t-tag v-for="tag in product.tags" :key="tag" theme="primary" variant="light">{{ tag }}</t-tag>
            </div>
            <div class="product-actions">
              <t-button theme="primary" variant="outline" @click="goTarget(product.primaryUrl)">
                {{ product.primaryLabel }}
              </t-button>
              <t-button variant="text" @click="goTarget(product.secondaryUrl)">{{ product.secondaryLabel }}</t-button>
            </div>
          </article>
        </div>
      </t-card>

      <t-card :bordered="false" class="section-card capability-card">
        <template #title>
          <span class="section-title">能力地图</span>
        </template>
        <div class="capability-groups">
          <article v-for="group in capabilityGroups" :key="group.title" class="capability-group">
            <h3>{{ group.title }}</h3>
            <ul>
              <li v-for="item in group.items" :key="item">{{ item }}</li>
            </ul>
          </article>
        </div>
      </t-card>
    </div>

    <!-- 当前登录用户 -->
    <t-card :bordered="false" class="section-card">
      <template #title>
        <span class="section-title">当前登录用户</span>
      </template>
      <t-descriptions :column="2">
        <t-descriptions-item label="用户名">{{ userStore.name }}</t-descriptions-item>
        <t-descriptions-item label="昵称">{{ userStore.nickname }}</t-descriptions-item>
        <t-descriptions-item label="用户ID">{{ userStore.userId }}</t-descriptions-item>
        <t-descriptions-item label="角色">{{ (userStore.roles || []).join(', ') }}</t-descriptions-item>
      </t-descriptions>
    </t-card>
  </div>
</template>

<script lang="ts" setup>
import { useUserStore } from '@/store';

defineOptions({ name: 'IndexPage' });

const userStore = useUserStore();

const products = [
  {
    name: 'RuoYi-Vue-Plus',
    version: 'v6.0.0',
    summary: '面向分布式集群场景的后台管理系统，保持现有业务接口与权限逻辑，适合先完成前端壳升级。',
    tags: ['Vue 3', 'TDesign', 'Spring Boot', 'Sa-Token'],
    primaryLabel: '访问 Gitee',
    primaryUrl: 'https://gitee.com/dromara/RuoYi-Vue-Plus',
    secondaryLabel: '查看更新日志',
    secondaryUrl: 'https://plus-doc.dromara.org/#/ruoyi-vue-plus/changlog',
  },
  {
    name: 'RuoYi-Cloud-Plus',
    version: 'v6.0.0',
    summary: '微服务通用权限管理系统，适合更复杂的服务治理场景，也可以沿用同样的前端升级思路。',
    tags: ['Spring Cloud', 'Gateway', 'Nacos', 'Dubbo'],
    primaryLabel: '访问 Gitee',
    primaryUrl: 'https://gitee.com/dromara/RuoYi-Cloud-Plus',
    secondaryLabel: '查看更新日志',
    secondaryUrl: 'https://plus-doc.dromara.org/#/ruoyi-cloud-plus/changlog',
  },
];

const capabilityGroups = [
  {
    title: '后端基建',
    items: ['Spring Boot / Spring Cloud', 'Sa-Token 认证与权限', 'MySQL / Redis', '代码生成器'],
  },
  {
    title: '平台能力',
    items: ['动态菜单与按钮权限', '监控、日志、在线用户', '任务调度与工作流', '文件存储与多云适配'],
  },
  {
    title: '前端方向',
    items: ['UI 卡片化', '主题与布局统一', '通用页面容器规范化', '企业化布局'],
  },
];

const goTarget = (url: string) => {
  window.open(url, '_blank');
};
</script>

<style lang="less" scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
}

.hero-panel {
  border-radius: var(--td-radius-large);
  padding: 30px;
  background:
    radial-gradient(circle at top left, rgba(53, 109, 255, 0.16), transparent 30%), var(--td-bg-color-container);
  border: 1px solid var(--td-component-stroke);
  box-shadow: var(--td-shadow-1);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 14px;

  h1 {
    margin: 0;
    font-size: clamp(28px, 4vw, 42px);
    line-height: 1.06;
    letter-spacing: -0.04em;
    color: var(--td-text-color-primary);
  }

  p {
    margin: 0;
    max-width: 760px;
    color: var(--td-text-color-secondary);
    font-size: 15px;
    line-height: 1.8;
  }
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
  gap: 20px;
}

.section-card {
  border-radius: var(--td-radius-large);

  :deep(.t-card__title) {
    padding: 0;
  }
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.product-list,
.capability-groups {
  display: grid;
  gap: 16px;
}

.product-card {
  padding: 22px;
  border-radius: var(--td-radius-large);
  background: var(--td-bg-color-secondarycontainer);
  border: 1px solid var(--td-component-stroke);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--td-shadow-1);
    border-color: var(--td-brand-color);
  }
}

.product-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h3 {
    margin: 0 0 8px;
    color: var(--td-text-color-primary);
    font-size: 20px;
    letter-spacing: -0.03em;
  }

  p {
    margin: 0;
    color: var(--td-text-color-secondary);
    line-height: 1.7;
  }
}

.product-version {
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--td-brand-color-light);
  color: var(--td-brand-color);
  font-size: 12px;
  font-weight: 700;
}

.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.product-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.capability-card {
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 28%), var(--td-bg-color-container);
}

.capability-group {
  padding: 18px 18px 18px 20px;
  border-radius: var(--td-radius-large);
  background: var(--td-bg-color-secondarycontainer);
  border: 1px solid var(--td-component-stroke);

  h3 {
    margin: 0 0 12px;
    color: var(--td-text-color-primary);
    font-size: 16px;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
  }

  li {
    position: relative;
    padding-left: 16px;
    color: var(--td-text-color-secondary);
    line-height: 1.7;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--td-brand-color);
      box-shadow: 0 0 0 5px var(--td-brand-color-light);
    }
  }
}

@media (max-width: 960px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-panel,
  .section-card {
    padding: 20px;
    border-radius: var(--td-radius-medium);
  }

  .product-top {
    flex-direction: column;
  }
}
</style>
