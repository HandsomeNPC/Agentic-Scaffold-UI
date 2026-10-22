<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法查询角色</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：首屏是工具结果，之后改条件 / 翻页由卡片直接调 /system/role/list -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">
        ✓ 角色列表
        <span class="count">{{ countText }}</span>
      </div>
      <div class="query">
        <t-input v-model="query.roleName" clearable placeholder="角色名称" size="small" style="width: 120px" />
        <t-input v-model="query.roleKey" clearable placeholder="权限字符" size="small" style="width: 120px" />
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
        <div v-if="!rows.length" style="font-size: 12px; color: #999">没有匹配的角色</div>
        <div v-for="r in rows" :key="r.roleKey" class="item">
          <div class="row">
            <span class="name">{{ r.roleName }}</span>
            <t-tag size="small" variant="outline">{{ r.roleKey }}</t-tag>
            <t-tag :theme="r.status === '停用' ? 'danger' : 'success'" class="status" size="small" variant="light">
              {{ r.status }}
            </t-tag>
          </div>
          <div v-if="r.dataScope || r.remark" class="sub">
            {{ [r.dataScope, r.remark].filter(Boolean).join(' · ') }}
          </div>
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
      <div style="font-size: 12px; color: #999">正在查询角色...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import type { PageInfo } from 'tdesign-vue-next';
import { computed, reactive, ref } from 'vue';

import { listRole } from '@/api/system/role';
import type { RoleQuery, RoleVO } from '@/api/system/role/types';
import { useDict } from '@/utils/dict';
import { selectDictLabel } from '@/utils/ruoyi';

/**
 * ListRoles 工具卡片（只读，非 HITL）。
 *
 * 注册为 `ListRoles` 工具的渲染组件（见 register.ts）。首屏展示工具结果（不分页，最多 50 个）；
 * 用户在卡片上点「查询」后改由卡片直接调角色管理列表接口 /system/role/list（同样要求 system:role:list）并分页，
 * 不再经过 Agent。行 key 用 roleKey：雪花 roleId 经 JSON.parse 会丢精度。
 */

/** 单个角色，对齐后端 roleItem。dataScope、status 已由后端翻成文字。 */
interface RoleItem {
  roleId: number | string;
  roleName: string;
  roleKey: string;
  dataScope?: string;
  status: string;
  remark?: string;
}

/** 返回值，对齐后端 rolesResult。 */
interface RolesResult {
  error?: string;
  truncated?: boolean;
  roles?: RoleItem[];
}

const props = defineProps<{
  status?: string;
  result?: RolesResult;
  args?: { roleName?: string; roleKey?: string; status?: string };
  respond?: (response: unknown[]) => void;
}>();

/** 数据范围不在字典表里，与角色管理页 dataScopeOptions、后端 dataScopeLabels 一致。 */
const dataScopeLabels: Record<string, string> = {
  '1': '全部数据权限',
  '2': '自定义数据权限',
  '3': '本部门数据权限',
  '4': '本部门及以下数据权限',
  '5': '仅本人数据权限',
  '6': '部门及以下或本人数据权限',
};

// 不解构：字典未缓存时 useDict 异步赋值，解构出来的会一直是初始的空数组。
const dict = useDict('sys_normal_disable');
const statusOptions = computed(() => dict.sys_normal_disable.map((d) => ({ label: d.label, value: d.value })));

const initialQuery = () => ({
  roleName: props.args?.roleName ?? '',
  roleKey: props.args?.roleKey ?? '',
  status: props.args?.status ?? '',
});
// args 与 result 同批注入，卡片进入「已完成」分支时已就绪，无需 watch。
const query = reactive(initialQuery());
const pageNum = ref(1);
const pageSize = ref(10);
const total = ref(0);
const loading = ref(false);
/** 卡片自己查到的行；为 null 时展示工具结果。 */
const apiRows = ref<RoleVO[] | null>(null);

const rows = computed<RoleItem[]>(() => {
  if (!apiRows.value) return props.result?.roles ?? [];
  return apiRows.value.map((r) => ({
    roleId: r.roleId,
    roleName: r.roleName,
    roleKey: r.roleKey,
    dataScope: dataScopeLabels[r.dataScope],
    status: selectDictLabel(dict.sys_normal_disable, r.status),
    remark: r.remark,
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
    const res = await listRole({ ...query, pageNum: pageNum.value, pageSize: pageSize.value } as RoleQuery);
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
