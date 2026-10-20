/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IS_REQUEST_PROXY: string;
  readonly VITE_API_URL: string;
  readonly VITE_API_URL_PREFIX: string;

  /** 页面标题 */
  readonly VITE_APP_TITLE: string;
  /** Logo 标题 */
  readonly VITE_APP_LOGO_TITLE: string;
  /** 运行环境 */
  readonly VITE_APP_ENV: string;
  /** 接口基础前缀，如 /dev-api、/prod-api */
  readonly VITE_APP_BASE_API: string;
  /** 应用访问路径前缀 */
  readonly VITE_APP_CONTEXT_PATH: string;
  /** 前端服务端口 */
  readonly VITE_APP_PORT: string;
  /** 接口加密开关（需后端同步开关） */
  readonly VITE_APP_ENCRYPT: string;
  /** 接口加密传输 RSA 公钥 */
  readonly VITE_APP_RSA_PUBLIC_KEY: string;
  /** 接口响应解密 RSA 私钥 */
  readonly VITE_APP_RSA_PRIVATE_KEY: string;
  /** 客户端授权 id */
  readonly VITE_APP_CLIENT_ID: string;
  /** 监控地址 */
  readonly VITE_APP_MONITOR_ADMIN: string;
  /** SnailJob 控制台地址 */
  readonly VITE_APP_SNAILJOB_ADMIN: string;
  /** SnailAI 控制台地址 */
  readonly VITE_APP_SNAILAI_ADMIN: string;
  /** 统一消息推送开关 */
  readonly VITE_APP_MESSAGE_ENABLED: string;
  /** 消息推送通道 sse / websocket */
  readonly VITE_APP_MESSAGE_TRANSPORT: string;
  /** 统一消息推送路径 */
  readonly VITE_APP_MESSAGE_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
