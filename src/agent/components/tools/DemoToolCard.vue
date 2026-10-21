<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 已完成：展示后端返回的订单结果 -->
    <template v-if="status === 'complete' && result">
      <template v-if="result.cancelled">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #888">已取消下单</div>
        <div style="font-size: 12px; color: #666">{{ result.message || '订单未创建。' }}</div>
      </template>
      <template v-else>
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 下单成功</div>
        <t-space direction="vertical" size="small">
          <div style="font-size: 12px; color: #666">订单号：{{ result.orderId }}</div>
          <div style="font-size: 12px; color: #666">{{ result.message }}</div>
        </t-space>
      </template>
    </template>

    <!-- 表单状态：用户确认/编辑订单并提交 -->
    <template v-else>
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px">请确认订单</div>
      <t-space direction="vertical" size="large" style="width: 100%">
        <div>
          <div style="margin-bottom: 4px; font-size: 12px">奶茶口味</div>
          <t-input v-model="flavor" placeholder="如 芋泥波波 / 四季春" style="width: 100%" />
        </div>
        <div>
          <div style="margin-bottom: 4px; font-size: 12px">杯型</div>
          <t-select v-model="size" :options="sizeOptions" placeholder="请选择杯型" />
        </div>
        <div>
          <div style="margin-bottom: 4px; font-size: 12px">甜度</div>
          <t-select v-model="sugar" :options="sugarOptions" placeholder="请选择甜度" />
        </div>
        <div>
          <div style="margin-bottom: 4px; font-size: 12px">杯数</div>
          <t-input-number v-model="count" :max="99" :min="1" style="width: 100%" />
        </div>
        <div style="font-size: 13px; font-weight: 600">合计 ¥{{ amountText }}</div>
        <t-button block theme="primary" @click="handleSubmit"> 确认提交</t-button>
      </t-space>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { ResumeEntry } from '../../api/types';

/**
 * Demo 工具卡片(Human-in-the-Loop)。
 *
 * 注册为 `Demo` 工具的渲染组件(见 register.ts，由 AgentPanel.vue 的 useAgentToolcall 装载)，
 * 由 ToolCallRenderer 按 toolCallName 匹配后渲染，props 也由它注入。
 * 表单字段对齐后端 demoArgs，提交时把确认后的订单通过 respond 交回上层。
 */

/** Demo 的入参，对齐后端 demoArgs。 */
interface DemoToolArgs {
  flavor?: string;
  size?: string;
  sugar?: string;
  count?: number;
}

/** Demo 的用户响应：确认/编辑后的订单字段，作为 ResumeEntry.payload 回传。 */
interface DemoToolResponse {
  flavor: string;
  size: string;
  sugar: string;
  count: number;
}

/** Demo 的返回值，对齐后端 demoResult。 */
interface DemoToolResult {
  cancelled?: boolean;
  message?: string;
  orderId?: string;
}

/**
 * 中断恢复条目，对齐后端 bo.ChatRequest.Resume []types.ResumeEntry。
 * payload 即 Demo 的用户响应 DemoToolResponse。
 */
type DemoResumeEntry = ResumeEntry & { payload?: DemoToolResponse };

const props = defineProps<{
  status?: string;
  respond?: (response: DemoResumeEntry[]) => void;
  result?: DemoToolResult;
  args?: DemoToolArgs;
}>();

const flavor = ref(props.args?.flavor ?? '');
const size = ref(props.args?.size ?? '中杯');
const sugar = ref(props.args?.sugar ?? '五分糖');
const count = ref(props.args?.count ?? 1);

// args 可能在组件已挂载后由渲染器注入(JSON.parse 完成较晚)，同步一次。
watch(
  () => props.args,
  (a) => {
    if (!a) return;
    flavor.value = a.flavor ?? flavor.value;
    size.value = a.size ?? size.value;
    sugar.value = a.sugar ?? sugar.value;
    count.value = a.count ?? count.value;
  },
);

const sizeOptions = [
  { label: '中杯', value: '中杯' },
  { label: '大杯', value: '大杯' },
];

const sugarOptions = [
  { label: '无糖', value: '无糖' },
  { label: '三分糖', value: '三分糖' },
  { label: '五分糖', value: '五分糖' },
  { label: '全糖', value: '全糖' },
];

/** 后端金额以分为单位，单杯 1800 分。 */
const amountText = computed(() => {
  const cents = (count.value || 1) * 1800;
  return (cents / 100).toFixed(2);
});

const handleSubmit = () => {
  // 对齐后端 bo.ChatRequest.Resume []types.ResumeEntry：
  // 用户确认即视为 resolved，把订单字段作为 payload 交回，interruptId 由后端回填。
  props.respond?.([
    {
      status: 'resolved',
      payload: {
        flavor: flavor.value,
        size: size.value,
        sugar: sugar.value,
        count: count.value,
      },
    },
  ]);
};
</script>
