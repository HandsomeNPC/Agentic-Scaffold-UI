import { i18n } from '@/locales';

/**
 * 获取当前语言（与后端 Content-Language 头约定一致）
 * @returns zh_CN | en_US
 */
export const getLanguage = (): string => {
  // composition 模式下 locale 是 ref
  const locale = (i18n.global.locale as unknown as { value: string })?.value ?? i18n.global.locale;
  return locale || 'zh_CN';
};

export default i18n;
