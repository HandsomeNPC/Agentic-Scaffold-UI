import type { AgentToolcallConfig } from '@tdesign-vue-next/chat';

import DemoToolCard from './demo/DemoToolCard.vue';
import AssignUserRolesToolCard from './system/AssignUserRolesToolCard.vue';
import ChangeUISettingsToolCard from './system/ChangeUISettingsToolCard.vue';
import ChangeUserStatusToolCard from './system/ChangeUserStatusToolCard.vue';
import DraftNoticeToolCard from './system/DraftNoticeToolCard.vue';
import GetCurrentUserToolCard from './system/GetCurrentUserToolCard.vue';
import GetDeptTreeToolCard from './system/GetDeptTreeToolCard.vue';
import GetMyMenusToolCard from './system/GetMyMenusToolCard.vue';
import GetMyMessagesToolCard from './system/GetMyMessagesToolCard.vue';
import GetMyPermissionsToolCard from './system/GetMyPermissionsToolCard.vue';
import GetOpenPagesToolCard from './system/GetOpenPagesToolCard.vue';
import GetUserDetailToolCard from './system/GetUserDetailToolCard.vue';
import ListDeptUsersToolCard from './system/ListDeptUsersToolCard.vue';
import ListPostsToolCard from './system/ListPostsToolCard.vue';
import ListRolesToolCard from './system/ListRolesToolCard.vue';
import ListRoleUsersToolCard from './system/ListRoleUsersToolCard.vue';
import NavigateToMenuToolCard from './system/NavigateToMenuToolCard.vue';
import SearchNoticesToolCard from './system/SearchNoticesToolCard.vue';
import SearchUsersToolCard from './system/SearchUsersToolCard.vue';
import SendMessageToolCard from './system/SendMessageToolCard.vue';
import SetFullscreenToolCard from './system/SetFullscreenToolCard.vue';
import UnlockUserToolCard from './system/UnlockUserToolCard.vue';
import UpdateMyAvatarToolCard from './system/UpdateMyAvatarToolCard.vue';
import UpdateMyProfileToolCard from './system/UpdateMyProfileToolCard.vue';

/**
 * 注册工具渲染组件。name 与后端工具名一一对应。
 */
export const toolcallActions: AgentToolcallConfig[] = [
  {
    name: 'Demo',
    description: '下单购买奶茶，需要用户二次确认',
    parameters: [
      { name: 'flavor', type: 'string', required: true },
      { name: 'size', type: 'string', required: true },
      { name: 'sugar', type: 'string', required: true },
      { name: 'count', type: 'number', required: true },
    ],
    component: DemoToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'GetCurrentUser',
    description: '查询当前登录用户的个人信息：账号、昵称、部门、角色、岗位、联系方式、最近登录',
    parameters: [],
    component: GetCurrentUserToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'GetMyMessages',
    description: '查询当前登录用户最近 30 天的站内消息，按系统消息 / 通知公告 / 工作流分类',
    parameters: [
      { name: 'category', type: 'string', required: false },
      { name: 'limit', type: 'number', required: false },
    ],
    component: GetMyMessagesToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'GetMyPermissions',
    description: '查询当前登录用户的角色与权限码，或判断是否拥有某项权限',
    parameters: [{ name: 'permission', type: 'string', required: false }],
    component: GetMyPermissionsToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'GetMyMenus',
    description: '查询当前登录用户可见的目录与菜单，回答某功能在哪个菜单',
    parameters: [{ name: 'keyword', type: 'string', required: false }],
    component: GetMyMenusToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'NavigateToMenu',
    description: '跳转到当前登录用户可见的某个菜单页面',
    parameters: [{ name: 'menu', type: 'string', required: true }],
    component: NavigateToMenuToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'GetOpenPages',
    description: '查询用户当前所在的页面与多标签栏里打开的页面',
    parameters: [],
    component: GetOpenPagesToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'ChangeUISettings',
    description: '修改主题模式、主题色、侧边栏模式、布局大小与界面元素开关，立即生效、可撤销',
    parameters: [
      { name: 'mode', type: 'string', required: false },
      { name: 'brandTheme', type: 'string', required: false },
      { name: 'sideMode', type: 'string', required: false },
      { name: 'layoutSize', type: 'string', required: false },
      { name: 'showHeader', type: 'boolean', required: false },
      { name: 'showBreadcrumb', type: 'boolean', required: false },
      { name: 'showFooter', type: 'boolean', required: false },
      { name: 'isUseTabsRouter', type: 'boolean', required: false },
      { name: 'menuAutoCollapsed', type: 'boolean', required: false },
    ],
    component: ChangeUISettingsToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'SetFullscreen',
    description: '进入或退出浏览器全屏，进入全屏需用户点击卡片按钮',
    parameters: [{ name: 'fullscreen', type: 'boolean', required: true }],
    component: SetFullscreenToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'SearchUsers',
    description: '按账号、昵称、手机号、状态、部门分页查询系统用户',
    parameters: [
      { name: 'userName', type: 'string', required: false },
      { name: 'nickName', type: 'string', required: false },
      { name: 'phoneNumber', type: 'string', required: false },
      { name: 'status', type: 'string', required: false },
      { name: 'deptId', type: 'number', required: false },
      { name: 'pageNum', type: 'number', required: false },
      { name: 'pageSize', type: 'number', required: false },
    ],
    component: SearchUsersToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'GetUserDetail',
    description: '按用户 ID 查询某个系统用户的详细信息',
    parameters: [{ name: 'userId', type: 'number', required: true }],
    component: GetUserDetailToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'GetDeptTree',
    description: '查询组织架构（部门树）',
    parameters: [
      { name: 'deptName', type: 'string', required: false },
      { name: 'status', type: 'string', required: false },
    ],
    component: GetDeptTreeToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'ListDeptUsers',
    description: '按部门 ID 查询该部门的直属成员',
    parameters: [
      { name: 'deptId', type: 'number', required: true },
      { name: 'limit', type: 'number', required: false },
    ],
    component: ListDeptUsersToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'ListRoles',
    description: '查询系统角色列表',
    parameters: [
      { name: 'roleName', type: 'string', required: false },
      { name: 'roleKey', type: 'string', required: false },
      { name: 'status', type: 'string', required: false },
    ],
    component: ListRolesToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'ListRoleUsers',
    description: '按角色 ID 分页查询已分配该角色的用户',
    parameters: [
      { name: 'roleId', type: 'number', required: true },
      { name: 'userName', type: 'string', required: false },
      { name: 'pageNum', type: 'number', required: false },
      { name: 'pageSize', type: 'number', required: false },
    ],
    component: ListRoleUsersToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'ListPosts',
    description: '查询系统岗位列表，可按部门过滤',
    parameters: [
      { name: 'postName', type: 'string', required: false },
      { name: 'postCode', type: 'string', required: false },
      { name: 'deptId', type: 'number', required: false },
      { name: 'status', type: 'string', required: false },
    ],
    component: ListPostsToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'SearchNotices',
    description: '按标题、类型、发布人分页查询通知公告（管理视角）',
    parameters: [
      { name: 'noticeTitle', type: 'string', required: false },
      { name: 'noticeType', type: 'string', required: false },
      { name: 'createByName', type: 'string', required: false },
      { name: 'pageNum', type: 'number', required: false },
      { name: 'pageSize', type: 'number', required: false },
    ],
    component: SearchNoticesToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'UpdateMyProfile',
    description: '修改当前登录用户本人的昵称、邮箱、手机号，需要用户确认',
    parameters: [
      { name: 'nickName', type: 'string', required: false },
      { name: 'email', type: 'string', required: false },
      { name: 'phoneNumber', type: 'string', required: false },
    ],
    component: UpdateMyProfileToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'UpdateMyAvatar',
    description: '修改当前登录用户本人的头像，由用户在卡片上选图并确认',
    parameters: [],
    component: UpdateMyAvatarToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'DraftNotice',
    description: '起草并发布通知公告，需要用户审阅确认',
    parameters: [
      { name: 'noticeTitle', type: 'string', required: true },
      { name: 'noticeType', type: 'string', required: true },
      { name: 'noticeContent', type: 'string', required: true },
      { name: 'status', type: 'string', required: false },
    ],
    component: DraftNoticeToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'ChangeUserStatus',
    description: '启用或停用系统用户，需要用户确认',
    parameters: [
      { name: 'userName', type: 'string', required: true },
      { name: 'status', type: 'string', required: true },
    ],
    component: ChangeUserStatusToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'UnlockUser',
    description: '解锁因密码输错被锁定的用户，需要用户确认',
    parameters: [{ name: 'userName', type: 'string', required: true }],
    component: UnlockUserToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'AssignUserRoles',
    description: '给系统用户重新分配角色，需要用户确认',
    parameters: [
      { name: 'userName', type: 'string', required: true },
      { name: 'roleKeys', type: 'array', required: true },
    ],
    component: AssignUserRolesToolCard as AgentToolcallConfig['component'],
  },
  {
    name: 'SendMessage',
    description: '给指定用户发送站内信，需要用户确认',
    parameters: [
      { name: 'userNames', type: 'array', required: true },
      { name: 'message', type: 'string', required: true },
    ],
    component: SendMessageToolCard as AgentToolcallConfig['component'],
  },
];
