<template>
  <div class="cache-page">
    <t-row :gutter="16">
      <t-col :lg="4" :xs="12">
        <t-card :bordered="false" title="Redis 基本信息">
          <t-descriptions :column="1" bordered>
            <t-descriptions-item label="Redis版本">{{ info?.redis_version || '—' }}</t-descriptions-item>
            <t-descriptions-item label="运行模式">{{ redisModeText }}</t-descriptions-item>
            <t-descriptions-item label="端口">{{ info?.tcp_port || '—' }}</t-descriptions-item>
            <t-descriptions-item label="客户端数">{{ info?.connected_clients || '—' }}</t-descriptions-item>
            <t-descriptions-item label="运行时长(天)">{{ info?.uptime_in_days || '—' }}</t-descriptions-item>
            <t-descriptions-item label="使用内存">{{ info?.used_memory_human || '—' }}</t-descriptions-item>
            <t-descriptions-item label="使用CPU">{{ usedCpuText }}</t-descriptions-item>
            <t-descriptions-item label="内存配置">{{ info?.maxmemory_human || '—' }}</t-descriptions-item>
            <t-descriptions-item label="AOF是否开启">{{ aofText }}</t-descriptions-item>
            <t-descriptions-item label="RDB是否成功">{{ info?.rdb_last_bgsave_status || '—' }}</t-descriptions-item>
            <t-descriptions-item label="网络入口/出口">{{ netText }}</t-descriptions-item>
            <t-descriptions-item label="Key数量">{{ dbSize }}</t-descriptions-item>
          </t-descriptions>
        </t-card>
      </t-col>
      <t-col :lg="8" :xs="12">
        <t-card :bordered="false" title="命令统计">
          <div ref="commandstatsRef" class="chart-box"></div>
        </t-card>
        <t-card :bordered="false" style="margin-top: 12px" title="内存消耗">
          <div ref="usedmemoryRef" class="chart-box"></div>
        </t-card>
      </t-col>
    </t-row>
  </div>
</template>

<script lang="ts" setup>
import * as echarts from 'echarts';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import type { CacheVO } from '@/api/monitor/cache/types';
import { getCache } from '@/api/monitor/cache';

defineOptions({ name: 'MonitorCache' });

const loading = ref(false);
const info = ref<CacheVO['info']>({});
const dbSize = ref(0);
const commandStats = ref<Array<{ name: string; value: string }>>([]);

const redisModeText = computed(() =>
  info.value?.redis_mode === 'standalone' ? '单机' : info.value?.redis_mode ? '集群' : '—',
);
const aofText = computed(() => (info.value?.aof_enabled === '0' ? '否' : info.value?.aof_enabled ? '是' : '—'));
const usedCpuText = computed(() => {
  const v = info.value?.used_cpu_user_children;
  return v ? parseFloat(v).toFixed(2) : '—';
});
const netText = computed(
  () => `${info.value?.instantaneous_input_kbps ?? '—'}kps/${info.value?.instantaneous_output_kbps ?? '—'}kps`,
);

const commandstatsRef = ref<HTMLElement | null>(null);
const usedmemoryRef = ref<HTMLElement | null>(null);
let commandstatsInstance: echarts.ECharts | undefined;
let usedmemoryInstance: echarts.ECharts | undefined;

const handleResize = () => {
  commandstatsInstance?.resize();
  usedmemoryInstance?.resize();
};
const disposeCharts = () => {
  commandstatsInstance?.dispose();
  usedmemoryInstance?.dispose();
  commandstatsInstance = undefined;
  usedmemoryInstance = undefined;
};

const load = async () => {
  loading.value = true;
  try {
    const res = await getCache();
    const data = res?.data;
    info.value = data?.info ?? {};
    dbSize.value = data?.dbSize ?? 0;
    commandStats.value = data?.commandStats ?? [];
    disposeCharts();
    if (commandstatsRef.value) {
      commandstatsInstance = echarts.init(commandstatsRef.value);
      commandstatsInstance.setOption({
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
        series: [
          {
            name: '命令',
            type: 'pie',
            roseType: 'radius',
            radius: [15, 95],
            center: ['50%', '50%'],
            data: commandStats.value.map((c) => ({ name: c.name, value: Number(c.value) || 0 })),
            animationEasing: 'cubicInOut',
            animationDuration: 1000,
          },
        ],
      });
    }
    if (usedmemoryRef.value) {
      usedmemoryInstance = echarts.init(usedmemoryRef.value);
      usedmemoryInstance.setOption({
        tooltip: { formatter: '{b} <br/>{a} : ' + (info.value.used_memory_human || '') },
        series: [
          {
            name: '峰值',
            type: 'gauge',
            min: 0,
            max: 1000,
            detail: { formatter: info.value.used_memory_human || '' },
            data: [{ value: parseFloat(info.value.used_memory_human || '0'), name: '内存消耗' }],
          },
        ],
      });
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  load();
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  disposeCharts();
});
</script>

<style lang="less" scoped>
.cache-page {
  padding: 16px;
}
.chart-box {
  width: 100%;
  height: 320px;
}
</style>
