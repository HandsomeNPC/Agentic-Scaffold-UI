import type { App } from 'vue';

import { hasPermi, hasRoles } from './permission';

/**
 * 注册全局自定义指令
 */
export default (app: App) => {
  app.directive('hasPermi', hasPermi);
  app.directive('hasRoles', hasRoles);
};
