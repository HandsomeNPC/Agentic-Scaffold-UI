<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法查询通知公告</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：首屏是工具结果，之后改条件 / 翻页由卡片直接调 /system/notice/list -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">
        ✓ 通知公告
        <span class="count">共 {{ total }} 条</span>
      </div>
      <div class="query">
        <t-input v-model="query.noticeTitle" clearable placeholder="标题" size="small" style="width: 140px" />
        <t-select
          v-model="query.noticeType"
          :options="typeOptions"
          clearable
          placeholder="类型"
          size="small"
          style="width: 90px"
        />
        <t-input v-model="query.createByName" clearable placeholder="发布人账号" size="small" style="width: 110px" />
        <t-button size="small" theme="primary" @click="search">查询</t-button>
        <t-button size="small" variant="outline" @click="reset">重置</t-button>
      </div>
      <t-loading :loading="loading" size="small">
        <div v-if="!rows.length" style="font-size: 12px; color: #999">没有匹配的通知公告</div>
        <div v-for="(n, i) in rows" :key="i" class="item">
          <div class="row">
            <t-tag size="small" theme="primary" variant="light">{{ n.noticeType }}</t-tag>
            <span class="title">{{ n.noticeTitle }}</span>
            <t-tag v-if="n.status === '关闭'" size="small" theme="default" variant="light">已关闭</t-tag>
          </div>
          <div v-if="n.summary" class="summary">{{ n.summary }}</div>
          <div class="meta">
            <span v-if="n.createByName">{{ n.createByName }}</span>
            <span>{{ formatTime(n.createTime) }}</span>
          </div>
        </div>
      </t-loading>
      <t-pagination
        v-if="total > 0"
        :current="pageNum"
        :page-size="pageSize"
        :page-size-options="[10, 20, 50]"
        :total="total"
        size="small"
        style="margin-top: 8px"
        @change="onPageChange"
      />
    </template>

    <!-- 查询中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在查询通知公告...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import type { PageInfo } from 'tdesign-vue-next';
import { computed, reactive, ref, watch } from 'vue';

import { listNotice } from '@/api/system/notice';
import type { NoticeQuery, NoticeVO } from '@/api/system/notice/types';
import { useDict } from '@/utils/dict';
import { selectDictLabel } from '@/utils/ruoyi';

/**
 * SearchNotices 工具卡片（只读，非 HITL）。
 *
 * 注册为 `SearchNotices` 工具的渲染组件（见 register.ts）。首屏展示工具结果；用户在卡片上改条件或翻页时，
 * 直接调公告管理列表接口 /system/notice/list（同样要求 system:notice:list），不再经过 Agent。
 * 排序与工具一致固定为发布时间倒序。
 *
 * summary 一律按文本插值渲染，不走 v-html；卡片自己查到的正文是富文本，先取纯文本再截断。
 * 标题可能重复、雪花 noticeId 经 JSON.parse 会丢精度，故行 key 用下标（列表只读、不重排）。
 */

/** 单条公告，对齐后端 noticeItem。noticeType、status 已由后端翻成文字。 */
interface NoticeItem {
  noticeId: number | string;
  noticeTitle: string;
  noticeType: string;
  status: string;
  summary?: string;
  createByName?: string;
  createTime?: string;
}

/** 返回值，对齐后端 noticesResult。 */
interface NoticesResult {
  error?: string;
  total?: number;
  pageNum?: number;
  pageSize?: number;
  notices?: NoticeItem[];
}

const props = defineProps<{
  status?: string;
  result?: NoticesResult;
  args?: { noticeTitle?: string; noticeType?: string; createByName?: string; pageNum?: number; pageSize?: number };
  respond?: (response: unknown[]) => void;
}>();

/** 与后端 maxNoticeSummaryRunes 一致。 */
const maxSummaryLength = 200;

// 不解构：字典未缓存时 useDict 异步赋值，解构出来的会一直是初始的空数组。
const dict = useDict('sys_notice_type', 'sys_notice_status');
const typeOptions = computed(() => dict.sys_notice_type.map((d) => ({ label: d.label, value: d.value })));

const initialQuery = () => ({
  noticeTitle: props.args?.noticeTitle ?? '',
  noticeType: props.args?.noticeType ?? '',
  createByName: props.args?.createByName ?? '',
});
const query = reactive(initialQuery());
const pageNum = ref(1);
const pageSize = ref(10);
const total = ref(0);
const loading = ref(false);
/** 卡片自己查到的行；为 null 时展示工具结果。 */
const apiRows = ref<NoticeVO[] | null>(null);

// result 可能在组件挂载后才注入（流式结束较晚），注入时同步一次表单与分页。
watch(
  () => props.result,
  (r) => {
    if (!r || apiRows.value) return;
    Object.assign(query, initialQuery());
    pageNum.value = r.pageNum ?? 1;
    pageSize.value = r.pageSize ?? 10;
    total.value = r.total ?? 0;
  },
  { immediate: true },
);

/** 富文本正文取纯文本摘要。DOMParser 解析出的文档不执行脚本、不加载资源，只读 textContent。 */
function toSummary(html?: string) {
  if (!html) return '';
  const text = (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxSummaryLength ? `${text.slice(0, maxSummaryLength)}…` : text;
}

const rows = computed<NoticeItem[]>(() => {
  if (!apiRows.value) return props.result?.notices ?? [];
  return apiRows.value.map((n) => ({
    noticeId: n.noticeId,
    noticeTitle: n.noticeTitle,
    noticeType: selectDictLabel(dict.sys_notice_type, n.noticeType),
    status: selectDictLabel(dict.sys_notice_status, n.status),
    summary: toSummary(n.noticeContent),
    createByName: n.createByName,
    createTime: n.createTime,
  }));
});

async function fetchPage() {
  loading.value = true;
  try {
    const res = await listNotice({
      ...query,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      orderByColumn: 'createTime',
      isAsc: 'desc',
    } as NoticeQuery);
    apiRows.value = res?.data?.rows ?? [];
    total.value = res?.data?.total ?? 0;
  } catch {
    // 错误提示由 request 拦截器统一弹出，保留当前数据
  } finally {
    loading.value = false;
  }
}

function search() {
  pageNum.value = 1;
  fetchPage();
}

function reset() {
  Object.assign(query, initialQuery());
  search();
}

function onPageChange(info: PageInfo) {
  pageNum.value = info.current;
  pageSize.value = info.pageSize;
  fetchPage();
}

/** createTime 是 RFC3339 字符串，本地化为可读形式；解析失败原样回显。 */
function formatTime(raw?: string) {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>
<style scoped>
.count {
  margin-left: 4px;
  font-size: 12px;
  font-weight: normal;
  color: #999;
}
.query {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.item + .item {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #eee;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 24px;
}
.title {
  color: #333;
  font-weight: 500;
  word-break: break-all;
}
.summary {
  font-size: 12px;
  line-height: 18px;
  color: #666;
  word-break: break-all;
}
.meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #999;
}
</style>
