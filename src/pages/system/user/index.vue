<template>
  <div class="user-page">
    <t-row :gutter="12">
      <!-- 左侧部门树 -->
      <t-col :lg="3" :xs="12">
        <t-card :bordered="false" class="dept-card">
          <template #title><div class="card-title">部门</div></template>
          <div class="dept-search">
            <t-input v-model="deptFilter" clearable placeholder="部门名称">
              <template #prefix-icon><t-icon name="search" /></template>
            </t-input>
            <div class="dept-tree-toggle">
              <t-button size="small" theme="primary" variant="text" @click="toggleDeptTree(true)">展开全部</t-button>
              <t-button size="small" theme="primary" variant="text" @click="toggleDeptTree(false)">折叠全部</t-button>
            </div>
          </div>
          <div class="dept-tree-wrap">
            <t-tree
              ref="deptTreeRef"
              v-model:actived="deptActived"
              :data="filteredDeptTree"
              :keys="{ label: 'label', value: 'id', children: 'children' }"
              activable
              hover
              @active-change="onDeptActive"
            />
          </div>
        </t-card>
      </t-col>

      <!-- 右侧用户列表 -->
      <t-col :lg="9" :xs="12">
        <t-card :bordered="false">
          <template #title><div class="card-title">用户管理</div></template>

          <t-form v-show="showSearch" :data="queryParams" layout="inline" @submit="handleQuery">
            <t-form-item label="用户名称" name="userName"
              ><t-input v-model="queryParams.userName" clearable placeholder="请输入用户名称"
            /></t-form-item>
            <t-form-item label="用户昵称" name="nickName"
              ><t-input v-model="queryParams.nickName" clearable placeholder="请输入用户昵称"
            /></t-form-item>
            <t-form-item label="手机号码" name="phoneNumber"
              ><t-input v-model="queryParams.phoneNumber" clearable placeholder="请输入手机号码"
            /></t-form-item>
            <t-form-item label="状态" name="status"
              ><dict-select
                v-model="queryParams.status"
                placeholder="用户状态"
                style="width: 150px"
                type="sys_normal_disable"
            /></t-form-item>
            <t-form-item label="创建时间" name="dateRange">
              <t-date-range-picker
                v-model="dateRange"
                clearable
                style="width: 280px"
                value-type="YYYY-MM-DD HH:mm:ss"
              />
            </t-form-item>
            <t-form-item :style="{ marginLeft: 'auto' }">
              <t-space>
                <t-button theme="primary" type="submit"
                  ><template #icon><search-icon /></template>搜索</t-button
                >
                <t-button theme="default" @click="resetQuery"
                  ><template #icon><refresh-icon /></template>重置</t-button
                >
              </t-space>
            </t-form-item>
          </t-form>

          <div class="toolbar">
            <t-button v-hasPermi="['system:user:add']" theme="primary" @click="handleAdd"
              ><template #icon><add-icon /></template>新增</t-button
            >
            <t-button
              v-hasPermi="['system:user:edit']"
              :disabled="single"
              theme="success"
              variant="outline"
              @click="handleUpdate()"
              ><template #icon><edit-icon /></template>修改</t-button
            >
            <t-popconfirm content="是否确认删除选中的用户?" @confirm="handleDelete()">
              <t-button v-hasPermi="['system:user:remove']" :disabled="multiple" theme="danger" variant="outline"
                ><template #icon><delete-icon /></template>删除</t-button
              >
            </t-popconfirm>
            <t-button v-hasPermi="['system:user:import']" theme="primary" variant="outline" @click="handleImport"
              ><template #icon><upload-icon /></template>导入</t-button
            >
            <t-button
              v-hasPermi="['system:user:edit']"
              :disabled="single"
              theme="default"
              variant="outline"
              @click="handleUnlock"
              ><template #icon><lock-off-icon /></template>解锁</t-button
            >
            <t-button v-hasPermi="['system:user:export']" theme="warning" variant="outline" @click="handleExport"
              ><template #icon><download-icon /></template>导出</t-button
            >
            <right-toolbar
              v-model:show-search="showSearch"
              :columns="columns"
              class="toolbar-right"
              storage-key="sys_user_column_visible"
              @query-table="getList"
            />
          </div>

          <t-table
            :columns="realColumns"
            :data="list"
            :loading="loading"
            :pagination="pagination"
            :selected-row-keys="selectedKeys"
            hover
            row-key="userId"
            stripe
            @select-change="onSelectChange"
            @page-change="onPageChange"
          >
            <template #status="{ row }">
              <t-switch
                :disabled="isSuperAdmin(row.userId)"
                :value="row.status === '0'"
                @change="(v: any) => handleStatusChange(row, v)"
              />
            </template>
            <template #createTime="{ row }">{{ parseTime(row.createTime) }}</template>
            <template #userName="{ row }">
              <t-link v-hasPermi="['system:user:query']" hover="color" theme="primary" @click="handleView(row)">{{
                row.userName
              }}</t-link>
            </template>
            <template #operation="{ row }">
              <t-space :breakLine="false" size="small">
                <t-link v-hasPermi="['system:user:query']" hover="color" theme="primary" @click="handleView(row)"
                  >详细</t-link
                >
                <template v-if="!isSuperAdmin(row.userId)">
                  <t-link v-hasPermi="['system:user:edit']" hover="color" theme="primary" @click="handleUpdate(row)"
                    >修改</t-link
                  >
                  <t-link v-hasPermi="['system:user:edit']" hover="color" theme="primary" @click="handleAuthRole(row)"
                    >分配角色</t-link
                  >
                  <t-link
                    v-hasPermi="['system:user:resetPwd']"
                    hover="color"
                    theme="primary"
                    @click="handleResetPwd(row)"
                    >重置密码</t-link
                  >
                  <t-popconfirm content="是否确认删除?" @confirm="handleDelete(row)">
                    <t-link v-hasPermi="['system:user:remove']" hover="color" theme="danger">删除</t-link>
                  </t-popconfirm>
                </template>
              </t-space>
            </template>
          </t-table>
        </t-card>
      </t-col>
    </t-row>

    <!-- 新增/修改 弹窗 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :confirm-btn="{ loading: submitting }"
      :header="dialogTitle"
      :on-confirm="onSubmit"
      width="680px"
    >
      <t-form ref="formRef" :data="form" :rules="rules" label-width="100px" @submit="onSubmit">
        <t-row>
          <t-col v-if="!isSelf" :span="6">
            <t-form-item label="归属部门" name="deptId">
              <t-tree-select
                v-model="form.deptId"
                :data="deptOptions"
                :keys="{ label: 'label', value: 'id', children: 'children' }"
                clearable
                filterable
                placeholder="请选择归属部门"
                @change="onFormDeptChange"
              />
            </t-form-item>
          </t-col>
          <t-col :span="6">
            <t-form-item label="昵称" name="nickName"
              ><t-input v-model="form.nickName" placeholder="请输入昵称"
            /></t-form-item>
          </t-col>
        </t-row>
        <t-row>
          <t-col :span="6"
            ><t-form-item label="用户名称" name="userName"
              ><t-input v-model="form.userName" :disabled="!!form.userId" placeholder="请输入用户名称" /></t-form-item
          ></t-col>
          <t-col v-if="!form.userId" :span="6"
            ><t-form-item label="密码" name="password"
              ><t-input v-model="form.password" placeholder="请输入密码" type="password" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="6"
            ><t-form-item label="手机号码" name="phoneNumber"
              ><t-input v-model="form.phoneNumber" placeholder="请输入手机号码" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="邮箱" name="email"
              ><t-input v-model="form.email" placeholder="请输入邮箱" /></t-form-item
          ></t-col>
        </t-row>
        <t-row>
          <t-col :span="6"
            ><t-form-item label="性别" name="gender"
              ><dict-select v-model="form.gender" placeholder="请选择" type="sys_user_gender" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="状态" name="status"
              ><dict-select v-model="form.status" placeholder="请选择" type="sys_normal_disable" /></t-form-item
          ></t-col>
        </t-row>
        <t-row v-if="!isSelf">
          <t-col :span="6"
            ><t-form-item label="岗位" name="postIds"
              ><t-select
                v-model="form.postIds"
                :options="postOptions"
                clearable
                filterable
                multiple
                placeholder="请选择岗位" /></t-form-item
          ></t-col>
          <t-col :span="6"
            ><t-form-item label="角色" name="roleIds"
              ><t-select
                v-model="form.roleIds"
                :options="roleOptions"
                clearable
                filterable
                multiple
                placeholder="请选择角色" /></t-form-item
          ></t-col>
        </t-row>
        <t-form-item label="备注" name="remark"
          ><t-textarea v-model="form.remark" :autosize="{ minRows: 2 }" placeholder="请输入备注"
        /></t-form-item>
      </t-form>
    </t-dialog>

    <!-- 重置密码 弹窗 -->
    <t-dialog
      v-model:visible="pwdDialogVisible"
      :confirm-btn="{ loading: resettingPwd }"
      :on-confirm="onResetPwd"
      header="重置密码"
      width="440px"
    >
      <t-form :data="pwdForm" label-width="100px">
        <t-form-item label="用户名称"><t-input v-model="pwdForm.userName" disabled /></t-form-item>
        <t-form-item label="新密码" name="password"
          ><t-input v-model="pwdForm.password" clearable placeholder="请输入新密码" type="password"
        /></t-form-item>
      </t-form>
    </t-dialog>

    <!-- 用户导入 弹窗 -->
    <t-dialog v-model:visible="importVisible" :on-confirm="submitImport" header="用户导入" width="420px">
      <input ref="importInput" accept=".xlsx,.xls" class="import-file-input" type="file" />
      <div class="import-tip">
        <div><t-checkbox v-model="importUpdateSupport" />是否更新已经存在的用户数据</div>
        <div>
          仅允许导入 xls、xlsx 格式文件。
          <t-link hover="color" theme="primary" @click="importTemplate">下载模板</t-link>
        </div>
      </div>
    </t-dialog>

    <!-- 用户详情 抽屉 -->
    <t-drawer v-model:visible="viewVisible" :footer="false" header="用户信息详情" size="480px">
      <t-descriptions v-if="viewData" :column="2" bordered>
        <t-descriptions-item label="用户名称">{{ viewData.nickName }}</t-descriptions-item>
        <t-descriptions-item label="归属部门">{{
          viewData.deptName || viewData.dept?.deptName || '-'
        }}</t-descriptions-item>
        <t-descriptions-item label="手机号码">{{ viewData.phoneNumber || '-' }}</t-descriptions-item>
        <t-descriptions-item label="邮箱">{{ viewData.email || '-' }}</t-descriptions-item>
        <t-descriptions-item label="登录账号">{{ viewData.userName }}</t-descriptions-item>
        <t-descriptions-item label="用户状态">
          <dict-tag :options="sys_normal_disable" :value="viewData.status" />
        </t-descriptions-item>
        <t-descriptions-item label="性别">
          <dict-tag :options="sys_user_gender" :value="viewData.gender" />
        </t-descriptions-item>
        <t-descriptions-item label="岗位">{{ viewPostNames || '-' }}</t-descriptions-item>
        <t-descriptions-item :span="2" label="角色">{{ viewRoleNames || '-' }}</t-descriptions-item>
        <t-descriptions-item label="创建时间">{{ parseTime(viewData.createTime) }}</t-descriptions-item>
        <t-descriptions-item label="最后登录">{{ parseTime(viewData.loginDate) }}</t-descriptions-item>
        <t-descriptions-item label="最后登录IP">{{ viewData.loginIp || '-' }}</t-descriptions-item>
        <t-descriptions-item label="备注">{{ viewData.remark || '-' }}</t-descriptions-item>
      </t-descriptions>
    </t-drawer>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule, PageInfo, PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import {
  AddIcon,
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  LockOffIcon,
  RefreshIcon,
  SearchIcon,
  UploadIcon,
} from 'tdesign-icons-vue-next';
import { computed, nextTick, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { UserForm, UserQuery, UserVO } from '@/api/system/user/types';
import {
  addUser,
  changeUserStatus,
  delUser,
  deptTreeSelect,
  getUser,
  listUser,
  resetUserPwd,
  unlockUser,
  updateUser,
} from '@/api/system/user';
import { getConfigKey } from '@/api/system/config';
import { optionselect as postOptionSelect } from '@/api/system/post';
import { isSuperAdmin } from '@/constants';
import { getLanguage } from '@/lang';
import { useUserStore } from '@/store';
import { download, globalHeaders } from '@/utils/request';
import { useDict } from '@/utils/dict';
import { useDateRangeQuery } from '@/hooks/useDateRangeQuery';
import { parseTime } from '@/utils/ruoyi';

defineOptions({ name: 'SystemUser' });

const router = useRouter();
const userStore = useUserStore();

const { sys_normal_disable, sys_user_gender } = useDict('sys_normal_disable', 'sys_user_gender');
const { dateRange, applyDateRange, resetDateRange } = useDateRangeQuery();

// 默认初始密码（参数 sys.user.initPassword），新增用户时填入密码框
const initPassword = ref('');
const loadInitPassword = async () => {
  try {
    const res = await getConfigKey('sys.user.initPassword');
    initPassword.value = (res?.data as string) ?? '';
  } catch {
    initPassword.value = '';
  }
};

const list = ref<UserVO[]>([]);
const loading = ref(false);
const selectedKeys = ref<(string | number)[]>([]);
const selectedRows = ref<UserVO[]>([]);
const single = computed(() => selectedRows.value.length !== 1);
const multiple = computed(() => selectedRows.value.length === 0);
const showSearch = ref(true);

const queryParams = reactive<UserQuery>({
  pageNum: 1,
  pageSize: 10,
  userName: '',
  nickName: '',
  phoneNumber: '',
  status: '',
});
const pagination = reactive({ current: 1, pageSize: 10, total: 0, showJumper: true });

const columnsData: PrimaryTableCol[] = [
  { colKey: 'row-select', type: 'multiple', width: 46, align: 'center' },
  { colKey: 'userId', title: '用户编号', width: 90, align: 'center' },
  { colKey: 'userName', title: '用户名称', width: 140 },
  { colKey: 'nickName', title: '用户昵称', width: 140 },
  { colKey: 'deptName', title: '归属部门', width: 160, ellipsis: true },
  { colKey: 'phoneNumber', title: '手机号码', width: 140 },
  { colKey: 'status', title: '状态', width: 90, align: 'center' },
  { colKey: 'createTime', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 260, fixed: 'right', align: 'center' },
];
const columns = ref<PrimaryTableCol[]>(columnsData);
const realColumns = computed<PrimaryTableCol[]>(() => {
  const all = columns.value as any[];
  return all.filter((c: any) => c.visible !== false) as unknown as PrimaryTableCol[];
});

// 左侧部门树
const deptTreeRef = ref();
const toggleDeptTree = (expand: boolean) => {
  const inst = deptTreeRef.value;
  if (expand) inst?.expandAll?.();
  else inst?.foldAll?.();
};
const deptTreeData = ref<any[]>([]);
const deptOptions = ref<any[]>([]);
const deptFilter = ref('');

const filterDeptNode = (nodes: any[], kw: string): any[] => {
  const res: any[] = [];
  nodes.forEach((n) => {
    const children = n.children?.length ? filterDeptNode(n.children, kw) : [];
    if (n.label?.toLowerCase().includes(kw) || children.length) {
      res.push({ ...n, children: children.length ? children : n.children });
    }
  });
  return res;
};
const filteredDeptTree = computed(() => {
  const kw = deptFilter.value.trim().toLowerCase();
  if (!kw) return deptTreeData.value;
  return filterDeptNode(deptTreeData.value, kw);
});

const loadDeptTree = async () => {
  const res = await deptTreeSelect();
  const data = (res?.data ?? []) as any[];
  deptTreeData.value = data;
  // 表单中的归属部门不可选择停用部门（返回独立新树，避免污染左侧完整部门树）
  deptOptions.value = filterDisabledDept(data);
  // 默认全部展开
  await nextTick();
  deptTreeRef.value?.expandAll?.();
};

const filterDisabledDept = (nodes: any[]): any[] =>
  nodes
    .filter((n) => !n.disabled)
    .map((n) => ({ ...n, children: n.children?.length ? filterDisabledDept(n.children) : undefined }));

const deptActived = ref<Array<string | number>>([]);
const onDeptActive = (vals: Array<string | number>) => {
  deptActived.value = vals ?? [];
  queryParams.deptId = vals?.[0];
  queryParams.pageNum = 1;
  getList();
};

const getList = async () => {
  loading.value = true;
  try {
    const res = await listUser(applyDateRange(queryParams));
    const data = res?.data;
    list.value = data?.rows ?? [];
    pagination.total = data?.total ?? 0;
    pagination.current = queryParams.pageNum;
    pagination.pageSize = queryParams.pageSize;
  } finally {
    loading.value = false;
  }
};

const onSelectChange = (keys: (string | number)[], options: any) => {
  selectedKeys.value = keys;
  selectedRows.value = options?.selectedRowData ?? [];
};
const onPageChange = (p: PageInfo) => {
  queryParams.pageNum = p.current;
  queryParams.pageSize = p.pageSize;
  getList();
};
const handleQuery = () => {
  queryParams.pageNum = 1;
  getList();
};
const resetQuery = () => {
  queryParams.userName = '';
  queryParams.nickName = '';
  queryParams.phoneNumber = '';
  queryParams.status = '';
  queryParams.deptId = undefined;
  deptActived.value = [];
  resetDateRange();
  handleQuery();
};
const handleExport = () => download('/system/user/export', { ...queryParams }, `user_${Date.now()}.xlsx`);

const handleStatusChange = async (row: UserVO, v: any) => {
  const status = v ? '0' : '1';
  const text = status === '0' ? '启用' : '停用';
  const confirm = DialogPlugin.confirm({
    header: '提示',
    body: `确认要"${text}""${row.userName}"用户吗?`,
    confirmBtn: { content: '确定', theme: 'primary' },
    onConfirm: async () => {
      try {
        await changeUserStatus(row.userId, status);
        row.status = status;
        MessagePlugin.success(text + '成功');
      } catch {
        // 失败回滚开关
        row.status = status === '0' ? '1' : '0';
      } finally {
        confirm.destroy();
      }
    },
    onClose: () => {
      // 取消则回滚
      row.status = status === '0' ? '1' : '0';
      confirm.destroy();
    },
  });
};

// ---- 表单 ----
const formRef = ref<FormInstanceFunctions>();
const dialogVisible = ref(false);
const dialogTitle = ref('');
const submitting = ref(false);
const roleOptions = ref<{ label: string; value: string | number }[]>([]);
const postOptions = ref<{ label: string; value: string | number }[]>([]);

// 编辑自己时不允许改部门/岗位/角色（与原项目一致）
const isSelf = computed(() => !!form.userId && String(form.userId) === String(userStore.userId));

const initForm = (): UserForm => ({
  userId: undefined,
  deptId: undefined,
  userName: '',
  nickName: '',
  password: '',
  phoneNumber: '',
  email: '',
  gender: '0',
  status: '0',
  remark: '',
  postIds: [],
  roleIds: [],
});

const form = reactive<UserForm>(initForm());
const rules: Record<string, FormRule[]> = {
  userName: [
    { required: true, message: '请输入用户名称', type: 'error' },
    { min: 2, max: 20, message: '用户名称长度必须介于 2 和 20 之间', type: 'error' },
  ],
  nickName: [{ required: true, message: '请输入昵称', type: 'error' }],
  password: [
    { required: true, message: '请输入密码', type: 'error' },
    { min: 5, max: 20, message: '用户密码长度必须介于 5 和 20 之间', type: 'error' },
    { pattern: /^[^<>"'|\\]+$/, message: '不能包含非法字符：< > " \' \\ |', type: 'error' },
  ],
  email: [{ email: true, message: '请输入正确的邮箱地址', type: 'error' }],
  phoneNumber: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', type: 'error' }],
  deptId: [{ required: true, message: '请选择归属部门', type: 'error' }],
  roleIds: [{ required: true, message: '用户角色不能为空', type: 'error' }],
};

const toRoleOptions = (roles: any[]) =>
  (roles ?? []).map((r) => ({ label: r.roleName, value: r.roleId, disabled: r.status === '1' }));
const toPostOptions = (posts: any[]) =>
  (posts ?? []).map((p) => ({ label: p.postName, value: p.postId, disabled: p.status === '1' }));

// 切换归属部门时按部门重新加载岗位（原项目 optionselect(deptId)），并清空已选岗位
const onFormDeptChange = async (val: any) => {
  form.postIds = [];
  try {
    const pr = await postOptionSelect(val);
    postOptions.value = toPostOptions(pr?.data ?? []);
  } catch {
    /* ignore */
  }
};

const handleAdd = async () => {
  Object.assign(form, initForm());
  await loadDeptTree();
  // 走 getUser() 拿全部岗位与角色
  const res = await getUser();
  const info = res?.data;
  postOptions.value = toPostOptions(info?.posts ?? []);
  roleOptions.value = toRoleOptions(info?.roles ?? []);
  form.password = initPassword.value ? String(initPassword.value) : '';
  dialogTitle.value = '新增用户';
  dialogVisible.value = true;
};

const handleUpdate = async (row?: UserVO) => {
  const t = row ?? selectedRows.value[0];
  if (!t) return;
  Object.assign(form, initForm());
  await loadDeptTree();
  const res = await getUser(t.userId);
  const info = res?.data;
  const u = info?.user ?? t;
  Object.assign(form, initForm(), {
    userId: u.userId,
    deptId: u.deptId,
    userName: u.userName,
    nickName: u.nickName,
    phoneNumber: u.phoneNumber,
    email: u.email,
    gender: u.gender,
    status: u.status,
    remark: u.remark,
    postIds: info?.postIds ?? [],
    roleIds: info?.roleIds ?? [],
  });
  postOptions.value = toPostOptions(info?.posts ?? []);
  // 角色合并：可选角色 + 用户已有角色（去重）
  const merged = [...(info?.roles ?? []), ...(u.roles ?? [])];
  const seen = new Map();
  merged.forEach((r) => seen.set(String(r.roleId), r));
  roleOptions.value = toRoleOptions([...seen.values()]);
  form.password = '';
  dialogTitle.value = '修改用户';
  dialogVisible.value = true;
};

const onSubmit = async () => {
  const valid = await formRef.value?.validate();
  if (valid !== true) return;
  submitting.value = true;
  try {
    if (form.userId) {
      // 编辑自己时置空部门/岗位/角色
      if (isSelf.value) {
        form.deptId = undefined;
        form.postIds = [];
        form.roleIds = [];
      }
      await updateUser(form);
      MessagePlugin.success('修改成功');
    } else {
      await addUser(form);
      MessagePlugin.success('新增成功');
    }
    dialogVisible.value = false;
    getList();
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (row?: UserVO) => {
  const ids = row ? [row.userId] : selectedRows.value.map((r) => r.userId);
  if (!ids.length) return;
  await delUser(ids);
  MessagePlugin.success('删除成功');
  selectedKeys.value = [];
  selectedRows.value = [];
  getList();
};

// ---- 重置密码 ----
const pwdDialogVisible = ref(false);
const resettingPwd = ref(false);
const pwdForm = reactive({ userId: '' as string | number, userName: '', password: '' });
const handleResetPwd = (row: UserVO) => {
  pwdForm.userId = row.userId;
  pwdForm.userName = row.userName;
  pwdForm.password = '';
  pwdDialogVisible.value = true;
};
const onResetPwd = async () => {
  const pwd = pwdForm.password;
  if (pwd.length < 5 || pwd.length > 20 || !/^[^<>"'|\\]+$/.test(pwd)) {
    MessagePlugin.warning('用户密码长度必须介于 5 和 20 之间，且不能包含非法字符：< > " \' \\ |');
    return;
  }
  resettingPwd.value = true;
  try {
    await resetUserPwd(pwdForm.userId, pwdForm.password);
    MessagePlugin.success(`修改成功，新密码是：${pwdForm.password}`);
    pwdDialogVisible.value = false;
  } finally {
    resettingPwd.value = false;
  }
};

// ---- 用户详情 ----
const viewVisible = ref(false);
const viewData = ref<UserVO | null>(null);
const viewInfo = ref<any>(null);
// getUser 返回 posts/roles 全集 + postIds/roleIds 已选，按 id 匹配名称（同原 view.vue）
const pickNames = (list: any[] | undefined, ids: any[] | undefined, idKey: string, nameKey: string) => {
  const sel = new Set((ids ?? []).map(String));
  return (list ?? [])
    .filter((x) => sel.has(String(x[idKey])))
    .map((x) => x[nameKey])
    .join('、');
};
const viewPostNames = computed(() => pickNames(viewInfo.value?.posts, viewInfo.value?.postIds, 'postId', 'postName'));
const viewRoleNames = computed(() => pickNames(viewInfo.value?.roles, viewInfo.value?.roleIds, 'roleId', 'roleName'));
const handleView = async (row: UserVO) => {
  const res = await getUser(row.userId);
  viewInfo.value = res?.data ?? null;
  viewData.value = res?.data?.user ?? row;
  viewVisible.value = true;
};

// ---- 分配角色 ----
const handleAuthRole = (row: UserVO) => {
  router.push(`/system/user-auth/role/${row.userId}`);
};

// ---- 解锁 ----
const handleUnlock = async () => {
  const row = selectedRows.value[0];
  if (!row) return;
  const confirm = DialogPlugin.confirm({
    header: '提示',
    body: `是否确认解锁用户编号为"${row.userId}"的数据项?`,
    onConfirm: async () => {
      try {
        await unlockUser(row.userId);
        MessagePlugin.success(`用户编号"${row.userId}"解锁成功`);
      } finally {
        confirm.destroy();
      }
    },
    onClose: () => confirm.destroy(),
  });
};

// ---- 导入 ----
const importVisible = ref(false);
const importUpdateSupport = ref(false);
const importInput = ref<HTMLInputElement | null>(null);
const handleImport = () => {
  importUpdateSupport.value = false;
  importVisible.value = true;
};
const importTemplate = () => download('/system/user/importTemplate', {}, `user_template_${Date.now()}.xlsx`);
const submitImport = async () => {
  const file = importInput.value?.files?.[0];
  if (!file) {
    MessagePlugin.warning('请选择文件');
    return;
  }
  const formData = new FormData();
  formData.append('file', file);
  try {
    const resp = await fetch(
      `${import.meta.env.VITE_APP_BASE_API}/system/user/importData?updateSupport=${importUpdateSupport.value ? 1 : 0}`,
      {
        method: 'POST',
        headers: { ...globalHeaders(), 'Content-Language': getLanguage() },
        body: formData,
      },
    );
    const result = await resp.json();
    const msg = String(result?.msg ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/<[^>]+>/g, '');
    DialogPlugin.alert({ header: '导入结果', body: msg, confirmBtn: '确定' });
    importVisible.value = false;
    if (importInput.value) importInput.value.value = '';
    getList();
  } catch (e: any) {
    MessagePlugin.error(e?.message || '导入失败');
  }
};

loadDeptTree();
loadInitPassword();
getList();
</script>

<style lang="less" scoped>
.user-page {
  padding: 16px;
}
.card-title {
  font-weight: 600;
}
.toolbar {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
.toolbar-right {
  margin-left: auto;
}
.dept-card {
  height: 100%;
}
.dept-search {
  margin-bottom: 8px;
}
.dept-tree-toggle {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
}
.dept-tree-wrap {
  max-height: 600px;
  overflow: auto;
}
.import-file-input {
  display: block;
  margin-bottom: 8px;
  width: 100%;
}
.import-tip {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  line-height: 1.8;
}
</style>
