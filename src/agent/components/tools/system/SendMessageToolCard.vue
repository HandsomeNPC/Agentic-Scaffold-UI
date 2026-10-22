<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 SafeTool 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="done?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 站内信发送失败</div>
      <div style="font-size: 12px; color: #666">{{ done.error }}</div>
    </template>

    <template v-else-if="done?.cancelled">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #888">已取消发送</div>
      <div style="font-size: 12px; color: #666">{{ done.message || '站内信未发出。' }}</div>
    </template>

    <template v-else-if="done">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 站内信已发送</div>
      <div class="field">
        <span class="label">收件人</span>
        <span class="tags">
          <t-tag v-for="r in done.recipients ?? []" :key="r" size="small" variant="light">{{ r }}</t-tag>
        </span>
      </div>
      <div class="field">
        <span class="label">内容</span>
        <span class="value content">{{ done.content }}</span>
      </div>
    </template>

    <template v-else-if="submitted">
      <div style="font-size: 12px; color: #999">
        {{ submitted === 'cancelled' ? '已取消，等待助手回复...' : '已确认，正在发送...' }}
      </div>
    </template>

    <!-- 待确认：收件人只读，正文可修改 -->
    <template v-else>
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px">请确认发送站内信</div>
      <t-space direction="vertical" size="large" style="width: 100%">
        <div>
          <div class="form-label">收件人（{{ userNames.length }} 人）</div>
          <div class="tags">
            <t-tag v-for="n in userNames" :key="n" size="small" variant="light">{{ n }}</t-tag>
          </div>
        </div>
        <div>
          <div class="form-label">内容</div>
          <t-textarea
            v-model="message"
            :autosize="{ minRows: 3, maxRows: 8 }"
            :maxlength="500"
            placeholder="消息正文，纯文本"
          />
        </div>
        <div v-if="!message.trim()" style="font-size: 12px; color: #e34d59">内容不能为空</div>
        <t-space>
          <t-button :disabled="!message.trim()" theme="primary" @click="confirm">确认发送</t-button>
          <t-button variant="outline" @click="cancel">取消</t-button>
        </t-space>
      </t-space>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { ResumeEntry } from '../../../api/types';

/**
 * SendMessage 工具卡片（HITL）。
 *
 * 注册为 `SendMessage` 工具的渲染组件（见 register.ts）。收件人只读展示（发给谁是这次审批的核心，
 * 后端恢复时也只认中断时保存的收件人）；正文可修改，确认后作为 payload.message 回传，后端以它为准重新校验。
 * 内容按文本插值渲染，不走 v-html。
 */

/** 入参，对齐后端 sendMessageArgs。 */
interface SendMessageArgs {
  userNames?: string[];
  message?: string;
}

/** 返回值，对齐后端 sendMessageResult。recipients 是「昵称（账号）」。 */
interface SendMessageResult {
  error?: string;
  cancelled?: boolean;
  message?: string;
  recipients?: string[];
  content?: string;
}

const props = defineProps<{
  status?: string;
  /** respond 之后、后端结果到达之前，渲染器会把 result 临时设成回传的 ResumeEntry 数组。 */
  result?: SendMessageResult | ResumeEntry[];
  args?: SendMessageArgs;
  respond?: (response: ResumeEntry[]) => void;
}>();

const done = computed(() =>
  props.status === 'complete' && props.result && !Array.isArray(props.result) ? props.result : undefined,
);
const submitted = computed(() => (Array.isArray(props.result) ? props.result[0]?.status : undefined));

/** 去空去重，口径与后端一致。 */
const userNames = computed(() => [...new Set((props.args?.userNames ?? []).map((n) => n.trim()).filter(Boolean))]);

const message = ref('');

// args 可能在组件挂载后才注入（JSON.parse 完成较晚），同步一次。
watch(
  () => props.args?.message,
  (m) => {
    if (m !== undefined) message.value = m;
  },
  { immediate: true },
);

function confirm() {
  props.respond?.([{ status: 'resolved', payload: { message: message.value.trim() } }]);
}

function cancel() {
  props.respond?.([{ status: 'cancelled' }]);
}
</script>
<style scoped>
.field {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 22px;
}
.label {
  flex: 0 0 56px;
  color: #999;
}
.value {
  color: #333;
  word-break: break-all;
}
.content {
  white-space: pre-wrap;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 2px;
}
.form-label {
  margin-bottom: 4px;
  font-size: 12px;
}
</style>
