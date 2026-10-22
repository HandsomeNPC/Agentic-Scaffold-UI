<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法查询部门</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：首屏是工具结果，之后改条件由卡片直接调 /system/dept/list；部门树不分页，默认全部展开 -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">
        ✓ {{ titleName ? `包含「${titleName}」的部门` : '组织架构' }}
        <span class="count">{{ countText }}</span>
      </div>
      <div class="query">
        <t-input v-model="query.deptName" clearable placeholder="部门名称" size="small" style="width: 140px" />
        <t-select
          v-model="query.status"
          :options="statusOptions"
          clearable
          placeholder="状态"
          size="small"
          style="width: 90px"
        />
        <t-button size="small" theme="primary" @click="search">查询</t-button>
        <t-button size="small" variant="outline" @click="reset">重置</t-button>
      </div>
      <t-loading :loading="loading" size="small">
        <div v-if="!treeData.length" style="font-size: 12px; color: #999">没有匹配的部门</div>
        <!-- key 随数据源切换，让 expand-all 对新树重新生效 -->
        <t-tree v-else :key="treeKey" :data="treeData" expand-all hover line>
          <template #label="{ node }">
            <span :class="{ stopped: node.data.stopped }">{{ node.label }}</span>
            <t-tag v-if="node.data.stopped" size="small" style="margin-left: 4px" theme="danger" variant="light">
              停用
            </t-tag>
          </template>
        </t-tree>
      </t-loading>
    </template>

    <!-- 查询中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在查询部门...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';

import { listDept } from '@/api/system/dept';
import type { DeptQuery, DeptVO } from '@/api/system/dept/types';
import { useDict } from '@/utils/dict';
import { handleTree } from '@/utils/ruoyi';

/**
 * GetDeptTree 工具卡片（只读，非 HITL）。
 *
 * 注册为 `GetDeptTree` 工具的渲染组件（见 register.ts）。首屏展示工具结果（后端最多 200 个节点，
 * 超出时 truncated 为 true、total 给出实际节点数）；用户在卡片上点「查询」后改由卡片直接调部门管理列表接口
 * /system/dept/list（同样要求 system:dept:list），不再经过 Agent，也不受 200 个的上限。
 *
 * 树节点 value 用路径下标而非 deptId：工具结果经 JSON.parse 解析，19 位雪花 ID 会丢精度，
 * 相邻 ID 可能被抹成同一个数，t-tree 的 value 撞车会导致展开 / 渲染错乱。
 */

/** 单个部门，对齐后端 deptNode。 */
interface DeptNode {
  deptId: number | string;
  deptName: string;
  disabled?: boolean;
  children?: DeptNode[];
}

/** 返回值，对齐后端 deptTreeResult。 */
interface DeptTreeResult {
  error?: string;
  total?: number;
  truncated?: boolean;
  depts?: DeptNode[];
}

/** t-tree 的节点数据。停用放在自定义字段 stopped 上：t-tree 的 disabled 会禁止交互，这里只做标记。 */
interface TreeItem {
  value: string;
  label: string;
  stopped?: boolean;
  children?: TreeItem[];
}

const props = defineProps<{
  status?: string;
  result?: DeptTreeResult;
  args?: { deptName?: string; status?: string };
  respond?: (response: unknown[]) => void;
}>();

// 不解构：字典未缓存时 useDict 异步赋值，解构出来的会一直是初始的空数组。
const dict = useDict('sys_normal_disable');
const statusOptions = computed(() => dict.sys_normal_disable.map((d) => ({ label: d.label, value: d.value })));

const initialQuery = () => ({ deptName: props.args?.deptName ?? '', status: props.args?.status ?? '' });
// args 与 result 同批注入，卡片进入「已完成」分支时已就绪，无需 watch。
const query = reactive(initialQuery());
const loading = ref(false);
/** 卡片自己查到的部门（已组装成树）；为 null 时展示工具结果。 */
const apiTree = ref<DeptVO[] | null>(null);
const apiCount = ref(0);
/** 标题里的名称跟着最近一次生效的查询走，而不是输入框的实时值。 */
const titleName = ref(props.args?.deptName ?? '');
const treeKey = ref(0);

function fromToolResult(nodes: DeptNode[], prefix: string): TreeItem[] {
  return nodes.map((n, i) => {
    const value = prefix ? `${prefix}-${i}` : `${i}`;
    return {
      value,
      label: n.deptName,
      stopped: n.disabled,
      children: n.children?.length ? fromToolResult(n.children, value) : undefined,
    };
  });
}

function fromApi(nodes: DeptVO[], prefix: string): TreeItem[] {
  return nodes.map((n, i) => {
    const value = prefix ? `${prefix}-${i}` : `${i}`;
    return {
      value,
      label: n.deptName,
      stopped: n.status === '1',
      children: n.children?.length ? fromApi(n.children, value) : undefined,
    };
  });
}

const treeData = computed(() =>
  apiTree.value ? fromApi(apiTree.value, '') : fromToolResult(props.result?.depts ?? [], ''),
);

const countText = computed(() => {
  if (apiTree.value) return `共 ${apiCount.value} 个`;
  const r = props.result;
  if (!r?.total) return '';
  return r.truncated ? `共 ${r.total} 个，仅展示前 200 个，点「查询」可查看全部` : `共 ${r.total} 个`;
});

async function search() {
  loading.value = true;
  try {
    const res = await listDept({ ...query } as DeptQuery);
    const list = Array.isArray(res?.data) ? res.data : [];
    apiCount.value = list.length;
    // 按条件过滤后祖先可能不在结果里，handleTree 会把找不到父级的节点当根，与后端 BuildMultiRootTree 口径一致。
    apiTree.value = handleTree<DeptVO>(list, 'deptId');
    titleName.value = query.deptName;
    treeKey.value++;
  } catch {
    // 错误提示由 request 拦截器统一弹出，保留当前数据
  } finally {
    loading.value = false;
  }
}

function reset() {
  Object.assign(query, initialQuery());
  search();
}
</script>
<style scoped>
.query {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.count {
  margin-left: 4px;
  font-size: 12px;
  font-weight: normal;
  color: #999;
}
.stopped {
  color: #999;
}
</style>
