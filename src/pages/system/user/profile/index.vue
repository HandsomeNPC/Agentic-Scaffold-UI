<template>
  <div v-if="profileLoaded" class="profile-page">
    <t-row :gutter="16">
      <t-col :lg="3" :xs="12">
        <t-card :bordered="false">
          <div class="user-center">
            <user-avatar :img="avatarUrl" @uploaded="onAvatarUploaded" />
            <div class="user-name">{{ form.nickName || form.userName }}</div>
          </div>
          <ul class="info-list">
            <li>
              <span class="info-label"><svg-icon icon-class="user" />用户名称</span>
              <span class="info-value">{{ profileUser.userName || '-' }}</span>
            </li>
            <li>
              <span class="info-label"><svg-icon icon-class="phone" />手机号码</span>
              <span class="info-value">{{ profileUser.phoneNumber || '-' }}</span>
            </li>
            <li>
              <span class="info-label"><svg-icon icon-class="email" />用户邮箱</span>
              <span class="info-value">{{ profileUser.email || '-' }}</span>
            </li>
            <li>
              <span class="info-label"><svg-icon icon-class="tree" />所属部门</span>
              <span class="info-value">
                {{ profileUser.deptName ? `${profileUser.deptName}${postGroup ? ' / ' + postGroup : ''}` : '-' }}
              </span>
            </li>
            <li>
              <span class="info-label"><svg-icon icon-class="peoples" />所属角色</span>
              <span class="info-value">{{ roleGroup || '-' }}</span>
            </li>
            <li>
              <span class="info-label"><svg-icon icon-class="date" />创建日期</span>
              <span class="info-value">{{ profileUser.createTime || '-' }}</span>
            </li>
          </ul>
        </t-card>
      </t-col>
      <t-col :lg="9" :xs="12">
        <t-card :bordered="false">
          <t-tabs v-model="activeTab">
            <t-tab-panel label="基本资料" value="base">
              <t-form ref="profileFormRef" :data="form" :rules="rules" class="profile-form" label-width="100px">
                <t-form-item label="用户名称" name="userName">
                  <t-input v-model="form.userName" disabled />
                </t-form-item>
                <t-form-item label="手机号码" name="phoneNumber">
                  <t-input v-model="form.phoneNumber" placeholder="请输入手机号码" />
                </t-form-item>
                <t-form-item label="邮箱" name="email">
                  <t-input v-model="form.email" placeholder="请输入邮箱" />
                </t-form-item>
                <t-form-item label="性别" name="gender">
                  <dict-select v-model="form.gender" placeholder="请选择" type="sys_user_gender" />
                </t-form-item>
                <t-form-item label="昵称" name="nickName">
                  <t-input v-model="form.nickName" placeholder="请输入昵称" />
                </t-form-item>
                <t-form-item>
                  <t-button :loading="saving" theme="primary" @click="handleSaveProfile">保存</t-button>
                  <t-button style="margin-left: 8px" theme="default" variant="outline" @click="handleClose"
                    >关闭</t-button
                  >
                </t-form-item>
              </t-form>
            </t-tab-panel>
            <t-tab-panel label="修改密码" value="pwd">
              <t-form ref="pwdFormRef" :data="pwdForm" :rules="pwdRules" class="profile-form" label-width="100px">
                <t-form-item label="旧密码" name="oldPassword">
                  <t-input v-model="pwdForm.oldPassword" clearable placeholder="请输入旧密码" type="password" />
                </t-form-item>
                <t-form-item label="新密码" name="newPassword">
                  <t-input v-model="pwdForm.newPassword" clearable placeholder="请输入新密码" type="password" />
                </t-form-item>
                <t-form-item label="确认密码" name="confirmPassword">
                  <t-input v-model="pwdForm.confirmPassword" clearable placeholder="请再次输入新密码" type="password" />
                </t-form-item>
                <t-form-item>
                  <t-button :loading="savingPwd" theme="primary" @click="handleSavePwd">保存</t-button>
                  <t-button style="margin-left: 8px" theme="default" variant="outline" @click="handleResetPwd"
                    >重置</t-button
                  >
                </t-form-item>
              </t-form>
            </t-tab-panel>
            <t-tab-panel label="在线设备" value="device">
              <t-table
                :columns="deviceColumns"
                :data="onlineDevices"
                :loading="deviceLoading"
                hover
                row-key="tokenId"
                stripe
              >
                <template #loginTime="{ row }">{{ parseTime(row.loginTime) }}</template>
                <template #operation="{ row }">
                  <t-popconfirm content="确认下线该设备?" @confirm="handleDelOnline(row)">
                    <t-link hover="color" theme="danger">下线</t-link>
                  </t-popconfirm>
                </template>
              </t-table>
            </t-tab-panel>
            <t-tab-panel label="第三方账号" value="social">
              <t-table
                :columns="socialColumns"
                :data="socialList"
                :loading="socialLoading"
                hover
                row-key="authId"
                stripe
              >
                <template #operation="{ row }">
                  <t-popconfirm content="确认解绑?" @confirm="handleUnlock(row)">
                    <t-link hover="color" theme="danger">解绑</t-link>
                  </t-popconfirm>
                </template>
              </t-table>
              <div style="margin-top: 12px">
                <t-space break-line>
                  <t-button
                    v-for="p in SOCIAL_PLATFORMS"
                    :key="p.source"
                    theme="primary"
                    variant="outline"
                    @click="bindSocial(p.source)"
                  >
                    <template #icon><svg-icon :icon-class="p.source" style="margin-right: 4px" /></template>绑定
                    {{ p.label }}
                  </t-button>
                </t-space>
              </div>
            </t-tab-panel>
          </t-tabs>
        </t-card>
      </t-col>
    </t-row>
  </div>
</template>

<script lang="ts" setup>
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { reactive, ref } from 'vue';

import type { UserProfileForm, UserVO } from '@/api/system/user/types';
import { getUserProfile, updateUserProfile, updateUserPwd } from '@/api/system/user';
import { useUserStore } from '@/store';
import { useDict } from '@/utils/dict';
import UserAvatar from './userAvatar.vue';

defineOptions({ name: 'UserProfile' });

const userStore = useUserStore();
const { sys_user_gender } = useDict('sys_user_gender');

const activeTab = ref('base');
const roleGroup = ref('');
const postGroup = ref('');
const profileUser = ref<Partial<UserVO>>({});
const profileLoaded = ref(false);
const form = reactive<UserProfileForm>({
  userName: '',
  nickName: '',
  phoneNumber: '',
  email: '',
  gender: '',
});
const avatarUrl = ref('');

const profileFormRef = ref<FormInstanceFunctions>();
const saving = ref(false);
const rules: Record<string, FormRule[]> = {
  nickName: [{ required: true, message: '请输入昵称', type: 'error' }],
  email: [
    { required: true, message: '邮箱地址不能为空', type: 'error' },
    { email: true, message: '请输入正确的邮箱地址', type: 'error' },
  ],
  phoneNumber: [
    { required: true, message: '手机号码不能为空', type: 'error' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', type: 'error' },
  ],
};

const loadProfile = async () => {
  const res = await getUserProfile();
  const data = res?.data;
  if (data?.user) {
    const u = data.user;
    form.userName = u.userName;
    form.nickName = u.nickName;
    form.phoneNumber = u.phoneNumber;
    form.email = u.email;
    form.gender = u.gender;
    avatarUrl.value = u.avatarUrl ?? '';
    roleGroup.value = data.roleGroup ?? '';
    postGroup.value = data.postGroup ?? '';
    profileUser.value = u;
    userStore.name = u.userName;
    userStore.nickname = u.nickName;
    userStore.avatar = u.avatarUrl ?? '';
    profileLoaded.value = true;
  }
};

const handleSaveProfile = async () => {
  const valid = await profileFormRef.value?.validate();
  if (valid !== true) return;
  saving.value = true;
  try {
    await updateUserProfile(form);
    MessagePlugin.success('修改成功');
    userStore.nickname = form.nickName ?? '';
    loadProfile();
  } finally {
    saving.value = false;
  }
};

const pwdFormRef = ref<FormInstanceFunctions>();
const savingPwd = ref(false);
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' });
const pwdRules: Record<string, FormRule[]> = {
  oldPassword: [{ required: true, message: '请输入旧密码', type: 'error' }],
  newPassword: [
    { required: true, message: '请输入新密码', type: 'error' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', type: 'error' },
    { pattern: /^[^<>"'|\\]+$/, message: '不能包含非法字符：< > " \' \\ |', type: 'error' },
    { validator: (val) => val !== pwdForm.oldPassword, message: '新密码不能与旧密码相同', type: 'error' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', type: 'error' },
    { validator: (val) => val === pwdForm.newPassword, message: '两次输入的密码不一致', type: 'error' },
  ],
};

const handleSavePwd = async () => {
  const valid = await pwdFormRef.value?.validate();
  if (valid !== true) return;
  savingPwd.value = true;
  try {
    await updateUserPwd(pwdForm.oldPassword, pwdForm.newPassword);
    MessagePlugin.success('修改成功');
    handleResetPwd();
  } finally {
    savingPwd.value = false;
  }
};

const handleResetPwd = () => {
  pwdForm.oldPassword = '';
  pwdForm.newPassword = '';
  pwdForm.confirmPassword = '';
};

const handleClose = () => {
  window.history.length > 1 ? window.history.back() : null;
};

// ---- 头像上传（裁剪）----
const onAvatarUploaded = (url: string) => {
  avatarUrl.value = url;
  userStore.avatar = url;
};

// ---- 在线设备 ----
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { delOnline, getOnline } from '@/api/monitor/online';
import { authRouterUrl, authUnlock, getAuthList } from '@/api/system/social/auth';
import type { OnlineVO } from '@/api/monitor/online/types';
import { parseTime } from '@/utils/ruoyi';

const onlineDevices = ref<OnlineVO[]>([]);
const deviceLoading = ref(false);
const deviceColumns: PrimaryTableCol[] = [
  { colKey: 'ipaddr', title: 'IP', width: 150 },
  { colKey: 'loginLocation', title: '登录地点', width: 160, ellipsis: true },
  { colKey: 'browser', title: '浏览器', width: 140 },
  { colKey: 'os', title: '操作系统', width: 160 },
  { colKey: 'loginTime', title: '登录时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 100, align: 'center' },
];
const loadOnline = async () => {
  deviceLoading.value = true;
  try {
    const res = await getOnline();
    onlineDevices.value = (res?.data?.rows ?? []) as OnlineVO[];
  } finally {
    deviceLoading.value = false;
  }
};
const handleDelOnline = async (row: OnlineVO) => {
  await delOnline(row.tokenId);
  MessagePlugin.success('下线成功');
  loadOnline();
};

// ---- 第三方账号 ----
const socialList = ref<any[]>([]);
const socialLoading = ref(false);
const SOCIAL_PLATFORMS = [
  { source: 'wechat', label: '微信' },
  { source: 'maxkey', label: 'MaxKey' },
  { source: 'topiam', label: 'TopIam' },
  { source: 'gitee', label: 'Gitee' },
  { source: 'github', label: 'GitHub' },
];
const socialColumns: PrimaryTableCol[] = [
  { colKey: 'source', title: '平台', width: 140 },
  { colKey: 'userName', title: '账号', width: 200, ellipsis: true },
  { colKey: 'operation', title: '操作', width: 100, align: 'center' },
];
const loadSocial = async () => {
  socialLoading.value = true;
  try {
    const res = await getAuthList();
    socialList.value = (res?.data ?? []) as any[];
  } finally {
    socialLoading.value = false;
  }
};
const handleUnlock = async (row: any) => {
  await authUnlock(row.id);
  MessagePlugin.success('解绑成功');
  loadSocial();
};
const bindSocial = async (source: string) => {
  const res: any = await authRouterUrl(source);
  if (res?.data) {
    window.location.href = res.data;
  }
};

loadProfile();
loadOnline();
loadSocial();
</script>

<style lang="less" scoped>
.profile-page {
  padding: 16px;
}
.user-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}
.avatar-wrap {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
}
.avatar-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 50%;
}
.avatar-wrap:hover .avatar-mask {
  opacity: 1;
}
.user-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}
.user-role {
  color: var(--td-text-color-secondary);
}
.info-list {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 0;
    font-size: 13px;
    border-top: 1px solid var(--td-component-stroke);
  }
  li:last-child {
    border-bottom: 1px solid var(--td-component-stroke);
  }
}
.info-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--td-text-color-primary);
  flex-shrink: 0;
}
.info-value {
  text-align: right;
  color: var(--td-text-color-secondary);
  word-break: break-word;
}
.profile-form {
  max-width: 520px;
  margin-top: 12px;
}
</style>
