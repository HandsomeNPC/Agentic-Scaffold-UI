<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法查询岗位</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：首屏是工具结果，之后改条件 / 翻页由卡片直接调 /system/post/list -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">
        ✓ 岗位列表
        <span class="count">{{ countText }}</span>
      </div>
      <div class="query">
        <t-input v-model="query.postName" clearable placeholder="岗位名称" size="small" style="width: 120px" />
        <t-input v-model="query.postCode" clearable placeholder="岗位编码" size="small" style="width: 110px" />
        <t-select
          v-model="query.status"
          :options="statusOptions"
          clearable
          placeholder="状态"
          size="small"
          style="width: 90px"
        />
        <t-tree-select
          v-model="query.belongDeptId"
          :data="deptTree"
          :keys="{ label: 'label', value: 'id', children: 'children' }"
          clearable
          filterable
          placeholder="部门（含下级）"
          size="small"
          style="width: 150px"
          @popup-visible-change="(visible: boolean) => visible && loadDeptTree()"
        />
        <t-button size="small" theme="primary" @click="search">查询</t-button>
        <t-button size="small" variant="outline" @click="reset">重置</t-button>
      </div>
      <t-loading :loading="loading" size="small">
        <div v-if="!rows.length" style="font-size: 12px; color: #999">没有匹配的岗位</div>
        <div v-for="p in rows" :key="p.postCode" class="item">
          <div class="row">
            <span class="name">{{ p.postName }}</span>
            <t-tag size="small" variant="outline">{{ p.postCode }}</t-tag>
            <span v-if="p.deptName" class="sub">{{ p.deptName }}</span>
            <t-tag :theme="p.status === '停用' ? 'danger' : 'success'" class="status" size="small" variant="light">
              {{ p.status }}
            </t-tag>
          </div>
          <div v-if="p.remark" class="sub">{{ p.remark }}</div>
        </div>
      </t-loading>
      <t-pagination
        v-if="apiRows && total > 0"
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
      <div style="font-size: 12px; color: #999">正在查询岗位...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import type { PageInfo } from 'tdesign-vue-next';
import { computed, reactive, ref } from 'vue';

import type { DeptTreeVO } from '@/api/system/dept/types';
import { deptTreeSelect, listPost } from '@/api/system/post';
import type { PostQuery, PostVO } from '@/api/system/post/types';
import { useDict } from '@/utils/dict';
import { selectDictLabel } from '@/utils/ruoyi';

/**
 * ListPosts 工具卡片（只读，非 HITL）。
 *
 * 注册为 `ListPosts` 工具的渲染组件（见 register.ts）。首屏展示工具结果（不分页，最多 50 个）；
 * 用户在卡片上点「查询」后改由卡片直接调岗位管理列表接口 /system/post/list（同样要求 system:post:list）并分页，
 * 不再经过 Agent。部门条件走 belongDeptId（含下级），与工具口径一致。
 *
 * 部门初值取 result.deptId 而非 args.deptId：args 是模型写的原始 JSON，数字形态的雪花 ID 经 JSON.parse 会丢精度；
 * result 由后端 jsonx 序列化，超界 ID 已是字符串。行 key 用 postCode 同理。
 */

/** 单个岗位，对齐后端 postItem。status 已由后端翻成文字。 */
interface PostItem {
  postId: number | string;
  postCode: string;
  postName: string;
  deptName?: string;
  status: string;
  remark?: string;
}

/** 返回值，对齐后端 postsResult。 */
interface PostsResult {
  error?: string;
  deptId?: number | string;
  truncated?: boolean;
  posts?: PostItem[];
}

const props = defineProps<{
  status?: string;
  result?: PostsResult;
  args?: { postName?: string; postCode?: string; deptId?: number | string; status?: string };
  respond?: (response: unknown[]) => void;
}>();

// 不解构：字典未缓存时 useDict 异步赋值，解构出来的会一直是初始的空数组。
const dict = useDict('sys_normal_disable');
const statusOptions = computed(() => dict.sys_normal_disable.map((d) => ({ label: d.label, value: d.value })));

const initialQuery = (): { postName: string; postCode: string; status: string; belongDeptId?: number | string } => ({
  postName: props.args?.postName ?? '',
  postCode: props.args?.postCode ?? '',
  status: props.args?.status ?? '',
  belongDeptId: props.result?.deptId || undefined,
});
// args 与 result 同批注入，卡片进入「已完成」分支时已就绪，无需 watch。
const query = reactive(initialQuery());
const pageNum = ref(1);
const pageSize = ref(10);
const total = ref(0);
const loading = ref(false);
/** 卡片自己查到的行；为 null 时展示工具结果。 */
const apiRows = ref<PostVO[] | null>(null);

/** 部门树：既是部门筛选的下拉数据，也用来回填列表行的部门名（列表接口不回填 deptName）。 */
const deptTree = ref<DeptTreeVO[]>([]);
const deptNames = computed(() => {
  const map = new Map<string, string>();
  const walk = (nodes: DeptTreeVO[]) =>
    nodes.forEach((n) => {
      map.set(String(n.id), n.label);
      if (n.children?.length) walk(n.children);
    });
  walk(deptTree.value);
  return map;
});
let deptTreeLoading: Promise<void> | null = null;
function loadDeptTree() {
  deptTreeLoading ??= deptTreeSelect()
    .then((res) => {
      deptTree.value = res?.data ?? [];
    })
    .catch(() => {
      deptTreeLoading = null; // 失败允许下次重试；错误提示由 request 拦截器统一弹出
    });
  return deptTreeLoading;
}
if (query.belongDeptId) loadDeptTree();

const rows = computed<PostItem[]>(() => {
  if (!apiRows.value) return props.result?.posts ?? [];
  return apiRows.value.map((p) => ({
    postId: p.postId,
    postCode: p.postCode,
    postName: p.postName,
    deptName: p.deptName || deptNames.value.get(String(p.deptId)),
    status: selectDictLabel(dict.sys_normal_disable, p.status),
    remark: p.remark,
  }));
});

const countText = computed(() => {
  if (apiRows.value) return `共 ${total.value} 个`;
  const n = rows.value.length;
  return props.result?.truncated ? `仅展示前 ${n} 个，点「查询」可分页查看全部` : `共 ${n} 个`;
});

async function fetchPage() {
  loading.value = true;
  try {
    const [res] = await Promise.all([
      listPost({ ...query, pageNum: pageNum.value, pageSize: pageSize.value } as PostQuery),
      loadDeptTree(),
    ]);
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
  margin-top: 6px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 24px;
}
.name {
  color: #333;
  font-weight: 500;
}
.sub {
  font-size: 12px;
  color: #999;
  word-break: break-all;
}
.status {
  margin-left: auto;
}
</style>
