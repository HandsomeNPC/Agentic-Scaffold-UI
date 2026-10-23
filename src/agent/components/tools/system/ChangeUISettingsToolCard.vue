<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法修改界面设置</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 无需修改 -->
    <template v-else-if="status === 'complete' && result && !result.apply">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">✓ 界面已是目标设置</div>
      <div style="font-size: 12px; color: #999">{{ result.message }}</div>
    </template>

    <!-- 已解析出要改的项 -->
    <template v-else-if="status === 'complete' && result?.apply">
      <div :style="{ color: headingColor }" style="font-size: 14px; font-weight: 600; margin-bottom: 8px">
        {{ heading }}
      </div>
      <div v-for="c in result.changes" :key="c.field" class="item">
        <span class="label">{{ c.label }}</span>
        <span class="value">
          <span v-if="c.field === 'brandTheme'" :style="{ background: c.before }" class="swatch" />{{ c.before }}
        </span>
        <span class="hint">→</span>
        <span class="value">
          <span v-if="c.field === 'brandTheme'" :style="{ background: c.after }" class="swatch" />{{ c.after }}
        </span>
      </div>
      <div style="margin-top: 8px">
        <t-button v-if="applied" size="small" variant="outline" @click="undo">撤销</t-button>
        <t-button v-else size="small" theme="primary" @click="apply">{{ undone ? '重新应用' : '应用' }}</t-button>
      </div>
    </template>

    <!-- 解析中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在修改界面设置...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, inject, ref, watch } from 'vue';

import { isLayoutSize, useLayoutSize } from '@/hooks/useLayoutSize';
import { useSettingStore } from '@/store';
import type { TState } from '@/store/modules/setting';

import { agentBusyKey } from '../context';

/**
 * ChangeUISettings 工具卡片（非 HITL，带副作用）。
 *
 * 注册为 `ChangeUISettings` 工具的渲染组件（见 register.ts）。后端以本轮上报的设置为基准算出
 * 要改的项（settings）与改前的值（before），卡片拿到后写进 settingStore，由 updateConfig 统一
 * 生效主题模式 / 主题色 / 侧边栏模式，并随 pinia 持久化，与在页面配置抽屉里改等价。
 * 布局大小不在 settingStore 里，单独交给 useLayoutSize，与顶栏的布局大小下拉等价。
 *
 * 只对本轮实时返回的结果自动应用（见 agentBusyKey）：切换会话、刷新恢复的历史卡片只展示，
 * 由用户手动点「应用」，否则翻一下历史主题就被改回去。
 */

/** 设置项，对齐后端 uiSettingsPatch，只含有变化的项。除 layoutSize 外字段名对齐 src/config/style.ts。 */
type SettingsPatch = Partial<
  Record<'mode' | 'brandTheme' | 'sideMode' | 'layoutSize', string> &
    Record<'showHeader' | 'showBreadcrumb' | 'showFooter' | 'isUseTabsRouter' | 'menuAutoCollapsed', boolean>
>;

/** 一项设置的前后对比，对齐后端 uiChange。 */
interface UIChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

/** 返回值，对齐后端 changeUISettingsResult。 */
interface ChangeUISettingsResult {
  error?: string;
  apply?: boolean;
  settings?: SettingsPatch;
  before?: SettingsPatch;
  changes?: UIChange[];
  message?: string;
}

const props = defineProps<{
  status?: string;
  result?: ChangeUISettingsResult;
  args?: SettingsPatch;
  respond?: (response: unknown[]) => void;
}>();

const settingStore = useSettingStore();
const { setLayoutSize } = useLayoutSize();
const chatBusy = inject(agentBusyKey, ref(false));

const applied = ref(false);
const undone = ref(false);

const heading = computed(() => {
  if (applied.value) return '✓ 已应用界面设置';
  if (undone.value) return '已撤销界面设置';
  return '界面设置（未应用）';
});
const headingColor = computed(() => (applied.value ? '#00a870' : '#999'));

/**
 * 剔掉空值：updateConfig 见到 mode / brandTheme 等键就会触发切换，空值会把主题切坏。
 * 只切模式时补上当前主题色：主题色的色阶按「色值 + 模式」分别生成，changeMode 不会重算，
 * 不补的话深色模式下沿用的是明亮模式的色阶。mode 须排在 brandTheme 前，updateConfig 按键序生效。
 */
function patchOf(p: SettingsPatch): Partial<TState> {
  const patch: Partial<TState> = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null));
  if (patch.mode && !patch.brandTheme) patch.brandTheme = settingStore.brandTheme;
  return patch;
}

function applyPatch(p?: SettingsPatch) {
  const { layoutSize, ...rest } = p ?? {};
  if (isLayoutSize(layoutSize)) setLayoutSize(layoutSize);
  const patch = patchOf(rest);
  if (Object.keys(patch).length) settingStore.updateConfig(patch);
}

function apply() {
  if (!props.result?.settings) return;
  applyPatch(props.result.settings);
  applied.value = true;
  undone.value = false;
}

function undo() {
  applyPatch(props.result?.before);
  applied.value = false;
  undone.value = true;
}

// 一张卡片只自动应用一次：immediate 兜住 TOOL_CALL_START 与 RESULT 同批到达、卡片挂载即 complete 的情况。
let autoApplied = false;
watch(
  () => props.status === 'complete' && props.result?.apply === true,
  (ready) => {
    if (!ready || autoApplied || !chatBusy.value) return;
    autoApplied = true;
    apply();
  },
  { immediate: true },
);
</script>
<style scoped>
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 24px;
}
.label {
  min-width: 96px;
  color: #666;
}
.value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #333;
}
.swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #dcdcdc;
}
.hint {
  color: #999;
}
</style>
