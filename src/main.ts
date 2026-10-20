/* eslint-disable simple-import-sort/imports */
import { createApp } from 'vue';
import TDesign from 'tdesign-vue-next';

import SvgIcon from '@/components/SvgIcon/index.vue';
import DictSelect from '@/components/DictSelect/index.vue';
import DictTag from '@/components/DictTag/index.vue';
import IconSelect from '@/components/IconSelect/index.vue';
import ImageUpload from '@/components/ImageUpload/index.vue';
import FileUpload from '@/components/FileUpload/index.vue';
import Editor from '@/components/Editor/index.vue';
import RightToolbar from '@/components/RightToolbar/index.vue';
import TreePanel from '@/components/TreePanel/index.vue';
import UserSelect from '@/components/UserSelect/index.vue';
import RoleSelect from '@/components/RoleSelect/index.vue';
import ImagePreview from '@/components/ImagePreview/index.vue';
import App from './App.vue';
import directive from './directive';
import router from './router';
import { store } from './store';
import i18n from './locales';

import 'tdesign-vue-next/es/style/index.css';
import '@/style/index.less';
import '@/style/size.less';
import 'virtual:svg-icons-register';
import './permission';

const app = createApp(App);

app.use(TDesign);
app.use(store);
app.use(router);
app.use(i18n);

// 全局 SVG 图标组件（RuoYi 菜单/按钮图标）
app.component('svg-icon', SvgIcon);
app.component('SvgIcon', SvgIcon);

// 全局字典组件（业务页 <dict-tag> / <dict-select> 直接使用）
app.component('DictTag', DictTag);
app.component('dict-tag', DictTag);
app.component('DictSelect', DictSelect);
app.component('dict-select', DictSelect);

// 全局图标选择器
app.component('IconSelect', IconSelect);
app.component('icon-select', IconSelect);

// 全局上传组件
app.component('ImageUpload', ImageUpload);
app.component('image-upload', ImageUpload);
app.component('FileUpload', FileUpload);
app.component('file-upload', FileUpload);

// 全局富文本编辑器
app.component('Editor', Editor);
app.component('editor', Editor);

// 全局表格右侧工具栏（搜索切换 / 刷新 / 列显隐）
app.component('RightToolbar', RightToolbar);
app.component('right-toolbar', RightToolbar);

// 全局可复用业务组件：左侧树面板 / 选人弹窗 / 选角色弹窗 / 图片预览
app.component('TreePanel', TreePanel);
app.component('tree-panel', TreePanel);
app.component('UserSelect', UserSelect);
app.component('user-select', UserSelect);
app.component('RoleSelect', RoleSelect);
app.component('role-select', RoleSelect);
app.component('ImagePreview', ImagePreview);
app.component('image-preview', ImagePreview);

// 全局自定义指令（v-hasPermi / v-hasRoles）
directive(app);

app.mount('#app');
