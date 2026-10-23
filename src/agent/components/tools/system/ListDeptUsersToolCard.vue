<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法查询部门成员</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：首屏是工具结果，查询 / 翻页时卡片直接调 /system/user/list/dept/:deptId 取全量后本地筛选分页 -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">
        ✓ {{ result.deptName || '部门' }} 的成员
        <span class="count">{{ countText }}</span>
      </div>
      <div class="query">
        <t-input v-model="query.keyword" clearable placeholder="账号 / 昵称" size="small" style="width: 130px" />
        <t-input v-model="query.phoneNumber" clearable placeholder="手机号" size="small" style="width: 120px" />
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
        <div v-if="!pageRows.length" style="font-size: 12px; color: #999">
          {{ allRows ? '没有匹配的成员' : '该部门暂无直属成员' }}
        </div>
        <div v-for="u in pageRows" :key="u.userName" class="item">
          <span class="name">{{ u.nickName || u.userName }}</span>
          <span class="sub">{{ u.userName }}</span>
          <span v-if="u.phoneNumber" class="sub">{{ u.phoneNumber }}</span>
          <t-tag :theme="u.status === '1' ? 'danger' : 'success'" class="status" size="small" variant="light">
            {{ selectDictLabel(dict.sys_normal_disable, u.status) }}
          </t-tag>
        </div>
      </t-loading>
      <t-pagination
        v-if="allRows && filteredRows.length > 0"
        :current="pageNum"
        :page-size="pageSize"
        :page-size-options="[10, 20, 50]"
        :total="filteredRows.length"
        size="small"
        style="margin-top: 8px"
        @change="onPageChange"
      />
    </template>

    <!-- 查询中 -->
    <template v-else>
      <div style="font-size: 12px; color: #999">正在查询部门成员...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import type { PageInfo } from 'tdesign-vue-next';
import { computed, reactive, ref } from 'vue';

import { listUserByDeptId } from '@/api/system/user';
import { useDict } from '@/utils/dict';
import { selectDictLabel } from '@/utils/ruoyi';

/**
 * ListDeptUsers 工具卡片（只读，非 HITL）。
 *
 * 注册为 `ListDeptUsers` 工具的渲染组件（见 register.ts）。只含直属成员、不含子部门；首屏展示工具结果
 * （最多 20 人，total 是截断前人数）。用户在卡片上点「查询」或翻页时，直接调按部门查用户接口
 * /system/user/list/dept/:deptId（同样要求 system:user:list），不再经过 Agent。该接口不分页、无筛选参数，
 * 故取一次全量后在本地筛选与分页。
 *
 * 部门取 result.deptId 而非 args.deptId：args 是模型写的原始 JSON，数字形态的雪花 ID 经 JSON.parse 会丢精度；
 * result 由后端 jsonx 序列化，超界 ID 已是字符串。行 key 用 userName 同理（库里唯一）。
 */

/** 单个成员，对齐后端 deptUserItem。status 是 sys_normal_disable 字典键值，渲染时翻成文字。 */
interface DeptUserItem {
  userId: number | string;
  userName: string;
  nickName: string;
  phoneNumber?: string;
  status: string;
}

/** 返回值，对齐后端 deptUsersResult。 */
interface DeptUsersResult {
  error?: string;
  deptId?: number | string;
  deptName?: string;
  total?: number;
  users?: DeptUserItem[];
}

const props = defineProps<{
  status?: string;
  result?: DeptUsersResult;
  args?: { deptId?: number | string; limit?: number };
  respond?: (response: unknown[]) => void;
}>();

// 不解构：字典未缓存时 useDict 异步赋值，解构出来的会一直是初始的空数组。
const dict = useDict('sys_normal_disable');
const statusOptions = computed(() => dict.sys_normal_disable.map((d) => ({ label: d.label, value: d.value })));

const initialQuery = () => ({ keyword: '', phoneNumber: '', status: '' });
const query = reactive(initialQuery());
/** 最近一次点「查询」时的条件；本地筛选按它走，输入框改了但没点查询时不生效。 */
const applied = reactive(initialQuery());
const pageNum = ref(1);
const pageSize = ref(10);
const loading = ref(false);
/** 卡片自己查到的全量成员；为 null 时展示工具结果。 */
const allRows = ref<DeptUserItem[] | null>(null);

const filteredRows = computed(() => {
  if (!allRows.value) return [];
  const kw = applied.keyword.trim().toLowerCase();
  const phone = applied.phoneNumber.trim();
  return allRows.value.filter(
    (u) =>
      (!kw || u.userName.toLowerCase().includes(kw) || u.nickName.toLowerCase().includes(kw)) &&
      (!phone || (u.phoneNumber ?? '').includes(phone)) &&
      (!applied.status || u.status === applied.status),
  );
});

const pageRows = computed<DeptUserItem[]>(() => {
  if (!allRows.value) return props.result?.users ?? [];
  const start = (pageNum.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

const countText = computed(() => {
  if (allRows.value) return `共 ${filteredRows.value.length} 人`;
  const total = props.result?.total ?? 0;
  const shown = props.result?.users?.length ?? 0;
  return total > shown ? `共 ${total} 人，显示前 ${shown} 人，点「查询」可翻页查看全部` : `共 ${total} 人`;
});

async function loadAll() {
  if (allRows.value || !props.result?.deptId) return;
  loading.value = true;
  try {
    const res = await listUserByDeptId(props.result.deptId);
    allRows.value = (res?.data ?? []).map((u) => ({
      userId: u.userId,
      userName: u.userName,
      nickName: u.nickName,
      phoneNumber: u.phoneNumber,
      status: u.status,
    }));
  } catch {
    // 错误提示由 request 拦截器统一弹出，保留当前数据
  } finally {
    loading.value = false;
  }
}

async function search() {
  Object.assign(applied, query);
  pageNum.value = 1;
  await loadAll();
}

function reset() {
  Object.assign(query, initialQuery());
  search();
}

function onPageChange(info: PageInfo) {
  pageNum.value = info.current;
  pageSize.value = info.pageSize;
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
.item {
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
  color: #999;
  word-break: break-all;
}
.status {
  margin-left: auto;
}
</style>
