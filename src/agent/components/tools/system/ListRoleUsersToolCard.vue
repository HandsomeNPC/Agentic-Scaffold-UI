<template>
  <t-card bordered style="margin-top: 8px">
    <!-- 工具报错：后端 safeToolMiddleware 把 error 转成 result.error，由模型转述，这里同步展示 -->
    <template v-if="status === 'complete' && result?.error">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #e34d59">✕ 无法查询角色成员</div>
      <div style="font-size: 12px; color: #666">{{ result.error }}</div>
    </template>

    <!-- 已完成：首屏是工具结果，之后改条件 / 翻页由卡片直接调 /system/role/authUser/allocatedList -->
    <template v-else-if="status === 'complete' && result">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #00a870">
        ✓ 拥有「{{ result.roleName || '该角色' }}」的用户
        <span class="count">共 {{ total }} 人</span>
      </div>
      <div class="query">
        <t-input v-model="query.userName" clearable placeholder="账号" size="small" style="width: 120px" />
        <t-input v-model="query.phoneNumber" clearable placeholder="手机号" size="small" style="width: 130px" />
        <t-button size="small" theme="primary" @click="search">查询</t-button>
        <t-button size="small" variant="outline" @click="reset">重置</t-button>
      </div>
      <t-loading :loading="loading" size="small">
        <div v-if="!rows.length" style="font-size: 12px; color: #999">暂无用户拥有该角色</div>
        <div v-for="u in rows" :key="u.userName" class="item">
          <span class="name">{{ u.nickName || u.userName }}</span>
          <span class="sub">{{ u.userName }}</span>
          <span v-if="u.deptName" class="sub">{{ u.deptName }}</span>
          <span v-if="u.phoneNumber" class="sub">{{ u.phoneNumber }}</span>
          <t-tag :theme="u.status === '停用' ? 'danger' : 'success'" class="status" size="small" variant="light">
            {{ u.status }}
          </t-tag>
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
      <div style="font-size: 12px; color: #999">正在查询角色成员...</div>
    </template>
  </t-card>
</template>
<script lang="ts" setup>
import type { PageInfo } from 'tdesign-vue-next';
import { computed, reactive, ref, watch } from 'vue';

import type { DeptTreeVO } from '@/api/system/dept/types';
import { allocatedUserList } from '@/api/system/role';
import { deptTreeSelect } from '@/api/system/user';
import type { UserQuery, UserVO } from '@/api/system/user/types';
import { useDict } from '@/utils/dict';
import { checkPermi } from '@/utils/permission';
import { selectDictLabel } from '@/utils/ruoyi';

/**
 * ListRoleUsers 工具卡片（只读，非 HITL）。
 *
 * 注册为 `ListRoleUsers` 工具的渲染组件（见 register.ts）。首屏展示工具结果；用户在卡片上改条件或翻页时，
 * 直接调角色授权页的已分配用户接口（同样要求 system:role:list），不再经过 Agent。
 *
 * 角色取 result.roleId 而非 args.roleId：args 是模型写的原始 JSON，数字形态的雪花 ID 经 JSON.parse 会丢精度；
 * result 由后端 jsonx 序列化，超界 ID 已是字符串。行 key 用 userName 同理（库里唯一）。
 */

/** 单个用户，对齐后端 roleUserItem。status 已由后端翻成文字。 */
interface RoleUserItem {
  userId: number | string;
  userName: string;
  nickName: string;
  deptName?: string;
  phoneNumber?: string;
  status: string;
}

/** 返回值，对齐后端 roleUsersResult。 */
interface RoleUsersResult {
  error?: string;
  roleId?: number | string;
  roleName?: string;
  total?: number;
  pageNum?: number;
  pageSize?: number;
  users?: RoleUserItem[];
}

const props = defineProps<{
  status?: string;
  result?: RoleUsersResult;
  args?: { roleId?: number | string; userName?: string; pageNum?: number; pageSize?: number };
  respond?: (response: unknown[]) => void;
}>();

// 不解构：字典未缓存时 useDict 异步赋值，解构出来的会一直是初始的空数组。
const dict = useDict('sys_normal_disable');

const initialQuery = () => ({ userName: props.args?.userName ?? '', phoneNumber: '' });
const query = reactive(initialQuery());
const pageNum = ref(1);
const pageSize = ref(10);
const total = ref(0);
const loading = ref(false);
/** 卡片自己查到的行；为 null 时展示工具结果。 */
const apiRows = ref<UserVO[] | null>(null);

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

/**
 * 列表接口不回填 deptName，借用户管理的部门树补。该树要求 system:user:list，与本卡片的 system:role:list 不同，
 * 没有时不查（否则拦截器会弹无权限提示），部门列留空。
 */
const deptNames = ref(new Map<string, string>());
let deptTreeLoaded = false;
async function loadDeptNames() {
  if (deptTreeLoaded || !checkPermi(['system:user:list'])) return;
  try {
    const res = await deptTreeSelect();
    const map = new Map<string, string>();
    const walk = (nodes: DeptTreeVO[]) =>
      nodes.forEach((n) => {
        map.set(String(n.id), n.label);
        if (n.children?.length) walk(n.children);
      });
    walk(res?.data ?? []);
    deptNames.value = map;
    deptTreeLoaded = true;
  } catch {
    // 部门名只是展示，失败不影响列表
  }
}

const rows = computed<RoleUserItem[]>(() => {
  if (!apiRows.value) return props.result?.users ?? [];
  return apiRows.value.map((u) => ({
    userId: u.userId,
    userName: u.userName,
    nickName: u.nickName,
    deptName: deptNames.value.get(String(u.deptId)),
    phoneNumber: u.phoneNumber,
    status: selectDictLabel(dict.sys_normal_disable, u.status),
  }));
});

async function fetchPage() {
  if (!props.result?.roleId) return;
  loading.value = true;
  try {
    const [res] = await Promise.all([
      allocatedUserList({
        ...query,
        roleId: props.result.roleId,
        pageNum: pageNum.value,
        pageSize: pageSize.value,
      } as UserQuery),
      loadDeptNames(),
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
