// axios 配置  可自行根据项目进行更改，只需更改该文件即可，其他文件可以不动
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { DialogPlugin, LoadingPlugin, MessagePlugin, NotifyPlugin } from 'tdesign-vue-next';
import isString from 'lodash/isString';
import merge from 'lodash/merge';

import { ContentTypeEnum } from '@/constants';
import { HttpStatus } from '@/enums';
import { getLanguage } from '@/lang';
import cache from '@/plugins/cache';
import router from '@/router';
import { useUserStore } from '@/store';
import { getToken } from '@/utils/auth';
import { generateAesKey, decryptBase64, decryptWithAes, encryptBase64, encryptWithAes } from '@/utils/crypto';
import { errorCode } from '@/utils/errorCode';
import { decrypt, encrypt } from '@/utils/jsencrypt';
import { blobValidate, tansParams } from '@/utils/ruoyi';
import { saveBlob } from '@/utils/save';
import type { AxiosTransform, CreateAxiosOptions } from './AxiosTransform';
import { VAxios } from './Axios';
import { formatRequestDate, joinTimestamp, setObjToUrlParams } from './utils';

// =====================================================================
//  若依 (RuoYi-Plus) 契约的 axios 实例 —— 默认导出 `service`
//  与原项目 src/utils/request.ts 保持一致：
//  - 返回格式 { code, msg, data }，code === 200 为成功
//  - resolve 整个 envelope，页面以 res.data 取业务数据
//  - 携带 Authorization: Bearer、clientid、Content-Language
//  - 支持 RSA+AES 接口加密(encrypt-key)、防重复提交、401 重新登录、blob 下载
// =====================================================================

const encryptHeader = 'encrypt-key';
let downloadLoadingInstance: ReturnType<typeof LoadingPlugin> | undefined;

/** 是否显示重新登录 */
export const isRelogin = { show: false };

function createHandledError(message: string) {
  const error = new Error(message) as Error & { isHandled?: boolean };
  error.isHandled = true;
  return error;
}

export function isHandledRequestError(error: unknown) {
  return Boolean((error as { isHandled?: boolean } | undefined)?.isHandled);
}

function normalizeErrorMessage(message?: string) {
  if (!message) {
    return undefined;
  }
  if (message === 'Network Error') {
    return '后端接口连接异常';
  }
  if (message.includes('timeout')) {
    return '系统接口请求超时';
  }
  if (message.includes('Request failed with status code')) {
    return `系统接口${message.slice(-3)}异常`;
  }
  return message;
}

async function parseResponseErrorData(data: unknown): Promise<string | undefined> {
  if (!data) {
    return undefined;
  }

  if (data instanceof Blob) {
    return parseResponseErrorData(await data.text());
  }

  if (data instanceof ArrayBuffer) {
    return parseResponseErrorData(new TextDecoder().decode(data));
  }

  if (typeof data === 'string') {
    const text = data.trim();
    if (!text) {
      return undefined;
    }
    try {
      return parseResponseErrorData(JSON.parse(text));
    } catch {
      return text;
    }
  }

  if (typeof data === 'object') {
    const payload = data as Record<string, any>;
    return payload.msg || payload.message || errorCode[payload.code] || errorCode['default'];
  }

  return undefined;
}

export async function extractErrorMessage(error: any): Promise<string | undefined> {
  const responseMessage = await parseResponseErrorData(error?.response?.data);
  if (responseMessage) {
    return responseMessage;
  }
  return normalizeErrorMessage(error?.message);
}

export const globalHeaders = () => {
  return {
    Authorization: 'Bearer ' + getToken(),
    clientid: import.meta.env.VITE_APP_CLIENT_ID,
  };
};

// 默认请求头
axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.headers['clientid'] = import.meta.env.VITE_APP_CLIENT_ID;

// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 50000,
  transitional: {
    // 超时错误更明确
    clarifyTimeoutError: true,
  },
});

// 请求拦截器
service.interceptors.request.use(
  (config: any) => {
    // 对应国际化资源文件后缀
    config.headers['Content-Language'] = getLanguage();

    const isToken = config.headers?.isToken === false;
    // 是否需要防止数据重复提交
    const isRepeatSubmit = config.headers?.repeatSubmit === false;
    // 是否需要加密
    const isEncrypt = config.headers?.isEncrypt === 'true';

    if (getToken() && !isToken) {
      // 让每个请求携带自定义 token 请根据实际情况自行修改
      config.headers['Authorization'] = 'Bearer ' + getToken();
    }
    // get 请求映射 params 参数
    if (config.method === 'get' && config.params) {
      let url = config.url + '?' + tansParams(config.params);
      url = url.slice(0, -1);
      config.params = {};
      config.url = url;
    }

    if (!isRepeatSubmit && (config.method === 'post' || config.method === 'put')) {
      const requestObj = {
        url: config.url,
        data: typeof config.data === 'object' ? JSON.stringify(config.data) : config.data,
        time: Date.now(),
      };
      const sessionObj = cache.session.getJSON('sessionObj');
      if (sessionObj === undefined || sessionObj === null || sessionObj === '') {
        cache.session.setJSON('sessionObj', requestObj);
      } else {
        const s_url = sessionObj.url; // 请求地址
        const s_data = sessionObj.data; // 请求数据
        const s_time = sessionObj.time; // 请求时间
        const interval = 500; // 间隔时间(ms)，小于此时间视为重复提交
        if (s_data === requestObj.data && requestObj.time - s_time < interval && s_url === requestObj.url) {
          const message = '数据正在处理，请勿重复提交';
          console.warn(`[${s_url}]: ` + message);
          return Promise.reject(new Error(message));
        } else {
          cache.session.setJSON('sessionObj', requestObj);
        }
      }
    }
    if (import.meta.env.VITE_APP_ENCRYPT === 'true') {
      // 当开启参数加密
      if (isEncrypt && (config.method === 'post' || config.method === 'put')) {
        // 生成一个 AES 密钥
        const aesKey = generateAesKey();
        config.headers[encryptHeader] = encrypt(encryptBase64(aesKey)) as string;
        config.data =
          typeof config.data === 'object'
            ? encryptWithAes(JSON.stringify(config.data), aesKey)
            : encryptWithAes(config.data, aesKey);
      }
    }
    // FormData 数据去掉请求头 Content-Type
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
service.interceptors.response.use(
  (res: any) => {
    if (import.meta.env.VITE_APP_ENCRYPT === 'true') {
      // 加密后的 AES 秘钥
      const keyStr = res.headers[encryptHeader];
      // 加密
      if (keyStr != null && keyStr != '') {
        const data = res.data;
        // 请求体 AES 解密
        const base64Str = decrypt(keyStr);
        // base64 解码 得到请求头的 AES 秘钥
        const aesKey = decryptBase64(base64Str!.toString());
        // aesKey 解码 data
        const decryptData = decryptWithAes(data, aesKey);
        // 将结果 (得到的是 JSON 字符串) 转为 JSON
        res.data = JSON.parse(decryptData);
      }
    }
    // 未设置状态码则默认成功状态
    const code = res.data.code || HttpStatus.SUCCESS;
    // 获取错误信息
    const msg = res.data.msg || errorCode[code] || errorCode['default'];
    // 二进制数据则直接返回
    if (res.request.responseType === 'blob' || res.request.responseType === 'arraybuffer') {
      return res.data;
    }
    if (code === HttpStatus.UNAUTHORIZED) {
      if (!isRelogin.show) {
        isRelogin.show = true;
        const dialog = DialogPlugin.confirm({
          header: '系统提示',
          body: '登录状态已过期，您可以继续留在该页面，或者重新登录',
          confirmBtn: '重新登录',
          cancelBtn: '取消',
          theme: 'warning',
          onConfirm: () => {
            isRelogin.show = false;
            dialog.destroy();
            useUserStore()
              .logout()
              .then(() => {
                router.replace({
                  path: '/login',
                  query: {
                    redirect: encodeURIComponent(router.currentRoute.value.fullPath || '/'),
                  },
                });
              });
          },
          onClose: () => {
            isRelogin.show = false;
            dialog.destroy();
          },
        });
      }
      return Promise.reject(createHandledError('无效的会话，或者会话已过期，请重新登录。'));
    } else if (code === HttpStatus.SERVER_ERROR) {
      MessagePlugin.error(msg);
      return Promise.reject(createHandledError(msg));
    } else if (code === HttpStatus.WARN) {
      MessagePlugin.warning(msg);
      return Promise.reject(createHandledError(msg));
    } else if (code !== HttpStatus.SUCCESS) {
      NotifyPlugin.error({ title: msg });
      return Promise.reject(createHandledError(msg));
    } else {
      return Promise.resolve(res.data);
    }
  },
  async (error: any) => {
    const message = (await extractErrorMessage(error)) || errorCode['default'];
    MessagePlugin.error(message);
    error.isHandled = true;
    return Promise.reject(error);
  },
);

// 通用下载方法
export function download(url: string, params: any, fileName: string) {
  downloadLoadingInstance = LoadingPlugin({
    fullscreen: true,
    attach: 'body',
    text: '正在下载数据，请稍候',
    showOverlay: true,
  });
  return service
    .post(url, params, {
      transformRequest: [(params: any) => tansParams(params)],
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      responseType: 'blob',
    })
    .then(async (resp: any) => {
      const isLogin = blobValidate(resp);
      if (isLogin) {
        const blob = new Blob([resp]);
        saveBlob(blob, fileName);
      } else {
        const blob = new Blob([resp]);
        const resText = await blob.text();
        const rspObj = JSON.parse(resText);
        const errMsg = errorCode[rspObj.code] || rspObj.msg || errorCode['default'];
        MessagePlugin.error(errMsg);
      }
      downloadLoadingInstance?.hide();
    })
    .catch((r: any) => {
      console.error(r);
      downloadLoadingInstance?.hide();
    });
}

/** GET 方式下载二进制流（对应原项目 plugins/download.ts 的 zip / oss） */
async function downloadGetBlob(url: string, resolveName: (headers: Record<string, any>) => string, type?: string) {
  const loading = LoadingPlugin({
    fullscreen: true,
    attach: 'body',
    text: '正在下载数据，请稍候',
    showOverlay: true,
  });
  try {
    // 直接用 axios，避免 service 拦截器把 GET params 拼接逻辑和 envelope 处理套在 blob 上
    const res = await axios({
      method: 'get',
      url: import.meta.env.VITE_APP_BASE_API + url,
      responseType: 'blob',
      headers: { ...globalHeaders(), 'Content-Language': getLanguage() },
    });
    if (blobValidate(res.data)) {
      saveBlob(new Blob([res.data], type ? { type } : undefined), resolveName(res.headers));
    } else {
      const rspObj = JSON.parse(await (res.data as Blob).text());
      MessagePlugin.error(errorCode[rspObj.code] || rspObj.msg || errorCode['default']);
    }
  } catch (e) {
    console.error(e);
    MessagePlugin.error((await extractErrorMessage(e)) || '下载文件出现错误，请联系管理员！');
  } finally {
    loading.hide();
  }
}

/** 下载 zip（代码生成） */
export function downloadZip(url: string, name: string) {
  return downloadGetBlob(url, () => name, 'application/zip');
}

/** 下载 OSS 文件（保留原文件名，走后端下载接口以计入权限与日志） */
export function downloadOss(ossId: string | number) {
  return downloadGetBlob(
    `/resource/oss/download/${ossId}`,
    (headers) => decodeURIComponent(String(headers['download-filename'] ?? ossId)),
    'application/octet-stream',
  );
}

// 导出若依风格的 axios 实例为默认导出（原项目 src/api/* 均以 `import request from '@/utils/request'` 使用）
export default service;

// =====================================================================
//  以下为 TDesign starter 自带的 VAxios 封装（具名导出 `request`）
//  仅服务于尚未迁移的演示页（dashboard/list/detail 等），后续随页面删除。
// =====================================================================

const env = import.meta.env.MODE || 'development';

// 如果是 mock 模式 或 没启用直连代理 就不配置 host 会走本地 Mock 拦截 或 Vite 代理
const host = env === 'mock' || import.meta.env.VITE_IS_REQUEST_PROXY !== 'true' ? '' : import.meta.env.VITE_API_URL;

// 数据处理，方便区分多种处理方式
const transform: AxiosTransform = {
  // 处理请求数据。如果数据不是预期格式，可直接抛出错误
  transformRequestHook: (res, options) => {
    const { isTransformResponse, isReturnNativeResponse } = options;

    // 如果 204 无内容直接返回
    const method = res.config.method?.toLowerCase();
    if (res.status === 204 && ['put', 'patch', 'delete'].includes(method ?? '')) {
      return res;
    }

    // 是否返回原生响应头 比如：需要获取响应头时使用该属性
    if (isReturnNativeResponse) {
      return res;
    }
    // 不进行任何处理，直接返回
    // 用于页面代码可能需要直接获取 code，data，message 这些信息时开启
    if (!isTransformResponse) {
      return res.data;
    }

    // 错误的时候返回
    const { data } = res;
    if (!data) {
      throw new Error('请求接口错误');
    }

    // 这里 code 为后台统一的字段，需要在 types.ts 内修改为项目自己的接口返回格式
    const { code } = data;

    // 这里逻辑可以根据项目进行修改
    const hasSuccess = data && code === 0;
    if (hasSuccess) {
      return data.data;
    }

    throw new Error(`请求接口错误, 错误码: ${code}`);
  },

  // 请求前处理配置
  beforeRequestHook: (config, options) => {
    const { apiUrl, isJoinPrefix, urlPrefix, joinParamsToUrl, formatDate, joinTime = true } = options;

    // 添加接口前缀
    if (isJoinPrefix && urlPrefix && isString(urlPrefix)) {
      config.url = `${urlPrefix}${config.url}`;
    }

    // 将 baseUrl 拼接
    if (apiUrl && isString(apiUrl)) {
      config.url = `${apiUrl}${config.url}`;
    }
    const params = config.params || {};
    const data = config.data || false;

    if (formatDate && data && !isString(data)) {
      formatRequestDate(data);
    }
    if (config.method?.toUpperCase() === 'GET') {
      if (!isString(params)) {
        // 给 get 请求加上时间戳参数，避免从缓存中拿数据。
        config.params = Object.assign(params || {}, joinTimestamp(joinTime, false));
      } else {
        // 兼容 restful 风格
        config.url = `${config.url + params}${joinTimestamp(joinTime, true)}`;
        config.params = undefined;
      }
    } else if (!isString(params)) {
      if (formatDate) {
        formatRequestDate(params);
      }
      if (
        Reflect.has(config, 'data') &&
        config.data &&
        (Object.keys(config.data).length > 0 || data instanceof FormData)
      ) {
        config.data = data;
        config.params = params;
      } else {
        // 非 GET 请求如果没有提供 data，则将 params 视为 data
        config.data = params;
        config.params = undefined;
      }
      if (joinParamsToUrl) {
        config.url = setObjToUrlParams(config.url as string, { ...config.params, ...config.data });
      }
    } else {
      // 兼容 restful 风格
      config.url += params;
      config.params = undefined;
    }
    return config;
  },

  // 请求拦截器处理
  requestInterceptors: (config, options) => {
    // 请求之前处理 config
    const userStore = useUserStore();
    const { token } = userStore;

    if (token && (config as Recordable)?.requestOptions?.withToken !== false) {
      // jwt token
      (config as Recordable).headers.Authorization = options.authenticationScheme
        ? `${options.authenticationScheme} ${token}`
        : token;
    }
    return config;
  },

  // 响应拦截器处理
  responseInterceptors: (res) => {
    return res;
  },

  // 响应错误处理
  responseInterceptorsCatch: (error: any, instance: AxiosInstance) => {
    const { config } = error;
    if (!config || !config.requestOptions.retry) return Promise.reject(error);

    config.retryCount = config.retryCount || 0;

    if (config.retryCount >= config.requestOptions.retry.count) return Promise.reject(error);

    config.retryCount += 1;

    const backoff = new Promise((resolve) => {
      setTimeout(() => {
        resolve(config);
      }, config.requestOptions.retry.delay || 1);
    });
    config.headers = { ...config.headers, 'Content-Type': ContentTypeEnum.Json };
    return backoff.then((config) => instance.request(config as AxiosRequestConfig));
  },
};

function createAxios(opt?: Partial<CreateAxiosOptions>) {
  return new VAxios(
    merge(
      <CreateAxiosOptions>{
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#authentication_schemes
        // 例如: authenticationScheme: 'Bearer'
        authenticationScheme: '',
        // 超时
        timeout: 10 * 1000,
        // 携带 Cookie
        withCredentials: true,
        // 头信息
        headers: { 'Content-Type': ContentTypeEnum.Json },
        // 数据处理方式
        transform,
        // 配置项，下面的选项都可以在独立的接口请求中覆盖
        requestOptions: {
          // 接口地址
          apiUrl: host,
          // 是否自动添加接口前缀
          isJoinPrefix: true,
          // 接口前缀
          // 例如: https://www.baidu.com/api
          // urlPrefix: '/api'
          urlPrefix: import.meta.env.VITE_API_URL_PREFIX,
          // 是否返回原生响应头 比如：需要获取响应头时使用该属性
          isReturnNativeResponse: false,
          // 需要对返回数据进行处理
          isTransformResponse: true,
          // post 请求的时候添加参数到 url
          joinParamsToUrl: false,
          // 格式化提交参数时间
          formatDate: true,
          // 是否加入时间戳
          joinTime: true,
          // 是否忽略请求取消令牌
          // 如果启用，则重复请求时不进行处理
          // 如果禁用，则重复请求时会取消当前请求
          ignoreCancelToken: true,
          // 是否携带 token
          withToken: true,
          // 重试
          retry: {
            count: 3,
            delay: 1000,
          },
        },
      },
      opt || {},
    ),
  );
}

/** TDesign starter 演示页使用的 VAxios 实例（具名导出） */
export const request = createAxios();

export type { AxiosInstance, AxiosRequestConfig };
