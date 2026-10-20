<template>
  <t-popup expand-animation placement="bottom-right" trigger="click">
    <template #content>
      <div class="header-msg">
        <div class="header-msg-top">
          <p>消息通知</p>
          <t-button v-if="unreadNotices.length > 0" class="clear-btn" theme="primary" variant="text" @click="setReadAll"
            >全部已读</t-button
          >
        </div>
        <t-list v-if="unreadNotices.length > 0" :split="false" class="narrow-scrollbar">
          <t-list-item v-for="item in unreadNotices" :key="item.messageId ?? item.time">
            <div>
              <p class="msg-content">{{ item.title }}</p>
              <p class="msg-type">{{ item.message }}</p>
            </div>
            <p class="msg-time">{{ item.time }}</p>
            <template #action>
              <t-button size="small" variant="outline" @click="setRead(item)">已读</t-button>
            </template>
          </t-list-item>
        </t-list>

        <div v-else class="empty-list">
          <p>暂无消息</p>
        </div>
        <div v-if="unreadNotices.length > 0" class="header-msg-bottom">
          <t-button block class="header-msg-bottom-link" theme="default" variant="text" @click="setReadAll">{{
            '查看全部并标记已读'
          }}</t-button>
        </div>
      </div>
    </template>
    <t-badge :count="unreadCount" :offset="[4, 4]">
      <t-button theme="default" shape="square" variant="text">
        <t-icon name="mail" />
      </t-button>
    </t-badge>
  </t-popup>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useNoticeStore } from '@/store';

const noticeStore = useNoticeStore();
const { notices, unreadCount } = storeToRefs(noticeStore);

const unreadNotices = computed(() => notices.value.filter((n) => !n.read));

const setRead = (item: { messageId?: string | number }) => {
  if (item.messageId !== undefined && item.messageId !== null) {
    noticeStore.markRead(item.messageId);
  }
};

const setReadAll = () => {
  noticeStore.readAll();
};
</script>
<style lang="less" scoped>
.header-msg {
  width: 400px;
  margin: calc(0px - var(--td-comp-paddingTB-xs)) calc(0px - var(--td-comp-paddingLR-s));

  .empty-list {
    text-align: center;
    padding: var(--td-comp-paddingTB-xxl) 0;
    font: var(--td-font-body-medium);
    color: var(--td-text-color-secondary);

    p {
      margin-top: var(--td-comp-margin-xs);
    }
  }

  &-top {
    position: relative;
    font: var(--td-font-title-medium);
    color: var(--td-text-color-primary);
    text-align: left;
    padding: var(--td-comp-paddingTB-l) var(--td-comp-paddingLR-xl) 0;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .clear-btn {
      right: calc(var(--td-comp-paddingTB-l) - var(--td-comp-paddingLR-xl));
    }
  }

  &-bottom {
    align-items: center;
    display: flex;
    justify-content: center;
    padding: var(--td-comp-paddingTB-s) var(--td-comp-paddingLR-s);
    border-top: 1px solid var(--td-component-stroke);

    &-link {
      text-decoration: none;
      cursor: pointer;
      color: var(--td-text-color-placeholder);
    }
  }

  .t-list {
    height: calc(100% - 104px);
    padding: var(--td-comp-margin-s) var(--td-comp-margin-s);
  }

  .t-list-item {
    overflow: hidden;
    width: 100%;
    padding: var(--td-comp-paddingTB-l) var(--td-comp-paddingLR-l);
    border-radius: var(--td-radius-default);
    font: var(--td-font-body-medium);
    color: var(--td-text-color-primary);
    cursor: pointer;
    transition: background-color 0.2s linear;

    &:hover {
      background-color: var(--td-bg-color-container-hover);

      .msg-content {
        color: var(--td-brand-color);
      }
    }

    .msg-content {
      margin-bottom: var(--td-comp-margin-s);
      font-weight: 600;
    }

    .msg-type {
      color: var(--td-text-color-secondary);
    }

    .msg-time {
      transition: all 0.2s ease;
      color: var(--td-text-color-secondary);
      font-size: 12px;
    }
  }
}
</style>
