<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 SafeTool 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="done?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 公告发布失败</div>
      <div style="font-size: 12px; color: #666">{{ done.error }}</div>
    </template>

    <template v-else-if="done?.cancelled">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #888">已取消发布</div>
      <div style="font-size: 12px; color: #666">{{ done.message || '公告未创建。' }}</div>
    </template>

    <template v-else-if="done">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 公告已发布</div>
      <div class="row">
        <t-tag v-if="done.noticeType" size="small" theme="primary" variant="light">{{ done.noticeType }}</t-tag>
        <span class="title">{{ done.noticeTitle }}</span>
        <t-tag v-if="done.status === '关闭'" size="small" theme="default" variant="light">已关闭</t-tag>
      </div>
      <div style="font-size: 12px; color: #999; margin-top: 4px">
        已推送给全部在线用户，可在「通知公告」菜单中查看与编辑。
      </div>
    </template>

    <template v-else-if="submitted">
      <div style="font-size: 12px; color: #999">
        {{ submitted === 'cancelled' ? '已取消，等待助手回复...' : '已确认，正在发布...' }}
      </div>
    </template>

    <!-- 待确认：草稿可直接在卡片上修改，确认发布的就是这里的内容 -->
    <template v-else>
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px">请审阅公告草稿</div>
      <t-space direction="vertical" size="large" style="width: 100%">
        <div>
          <div class="form-label">标题</div>
          <t-input v-model="form.noticeTitle" :maxlength="50" placeholder="公告标题" show-limit-number />
        </div>
        <div>
          <div class="form-label">类型</div>
          <t-radio-group v-model="form.noticeType" :options="typeOptions" />
        </div>
        <div>
          <div class="form-label">正文</div>
          <t-textarea
            v-model="form.noticeContent"
            :autosize="{ minRows: 4, maxRows: 12 }"
            :maxlength="5000"
            placeholder="纯文本，换行分段"
          />
        </div>
        <div>
          <div class="form-label">状态</div>
          <t-radio-group v-model="form.status" :options="statusOptions" />
        </div>
        <div style="font-size: 12px; color: #999">发布后会立即推送给全部在线用户。</div>
        <div v-if="invalidReason" style="font-size: 12px; color: #e34d59">{{ invalidReason }}</div>
        <t-space>
          <t-button :disabled="!!invalidReason" theme="primary" @click="confirm">确认发布</t-button>
          <t-button variant="outline" @click="cancel">取消</t-button>
        </t-space>
      </t-space>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, reactive, watch } from 'vue';

import { useDict } from '@/utils/dict';

import type { ResumeEntry } from '../../../api/types';

/**
 * DraftNotice 工具卡片（HITL）。
 *
 * 注册为 `DraftNotice` 工具的渲染组件（见 register.ts）。模型起草的标题 / 类型 / 正文 / 状态填进表单，
 * 用户可直接修改；确认后把最终草稿作为 payload 回传，后端以它为准重新校验并发布。
 * 正文按纯文本编辑与回传，转成段落 HTML 由后端负责（含转义），这里不拼 HTML。
 */

/** 入参与用户响应，对齐后端 draftNoticeArgs。 */
interface DraftNoticeArgs {
  noticeTitle?: string;
  noticeType?: string;
  noticeContent?: string;
  status?: string;
}

/** 返回值，对齐后端 draftNoticeResult。noticeType、status 已由后端翻成文字。 */
interface DraftNoticeResult {
  error?: string;
  cancelled?: boolean;
  message?: string;
  noticeId?: number | string;
  noticeTitle?: string;
  noticeType?: string;
  status?: string;
}

const props = defineProps<{
  status?: string;
  /** respond 之后、后端结果到达之前，渲染器会把 result 临时设成回传的 ResumeEntry 数组。 */
  result?: DraftNoticeResult | ResumeEntry[];
  args?: DraftNoticeArgs;
  respond?: (response: ResumeEntry[]) => void;
}>();

const done = computed(() =>
  props.status === 'complete' && props.result && !Array.isArray(props.result) ? props.result : undefined,
);
const submitted = computed(() => (Array.isArray(props.result) ? props.result[0]?.status : undefined));

// 不解构：字典未缓存时 useDict 异步赋值，解构出来的会一直是初始的空数组。
const dict = useDict('sys_notice_type', 'sys_notice_status');
const typeOptions = computed(() => dict.sys_notice_type.map((d) => ({ label: d.label, value: d.value })));
const statusOptions = computed(() => dict.sys_notice_status.map((d) => ({ label: d.label, value: d.value })));

const form = reactive({ noticeTitle: '', noticeType: '1', noticeContent: '', status: '0' });

// args 可能在组件挂载后才注入（JSON.parse 完成较晚），同步一次。
watch(
  () => props.args,
  (a) => {
    if (!a) return;
    form.noticeTitle = a.noticeTitle ?? form.noticeTitle;
    form.noticeType = a.noticeType || form.noticeType;
    form.noticeContent = a.noticeContent ?? form.noticeContent;
    form.status = a.status || form.status;
  },
  { immediate: true },
);

/** 与后端校验口径一致，提前拦住必然失败的提交。 */
const invalidReason = computed(() => {
  if (!form.noticeTitle.trim()) return '标题不能为空';
  if (!form.noticeContent.trim()) return '正文不能为空';
  return '';
});

function confirm() {
  props.respond?.([
    {
      status: 'resolved',
      payload: {
        noticeTitle: form.noticeTitle.trim(),
        noticeType: form.noticeType,
        noticeContent: form.noticeContent.trim(),
        status: form.status,
      } satisfies DraftNoticeArgs,
    },
  ]);
}

function cancel() {
  props.respond?.([{ status: 'cancelled' }]);
}
</script>
<style scoped>
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
.form-label {
  margin-bottom: 4px;
  font-size: 12px;
}
</style>
