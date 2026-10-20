import path from 'node:path';

import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import type { ConfigEnv, UserConfig } from 'vite';
import { loadEnv } from 'vite';
import { viteMockServe } from 'vite-plugin-mock';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons-ng';
import svgLoader from 'vite-svg-loader';

const CWD = process.cwd();

// https://vitejs.dev/config/
export default ({ mode }: ConfigEnv): UserConfig => {
  const { VITE_BASE_URL, VITE_API_URL, VITE_API_URL_PREFIX, VITE_APP_PORT } = loadEnv(mode, CWD);
  return {
    base: VITE_BASE_URL,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    css: {
      preprocessorOptions: {
        less: {
          modifyVars: {
            hack: `true; @import (reference) "${path.resolve('src/style/variables.less')}";`,
          },
          math: 'strict',
          javascriptEnabled: true,
        },
      },
    },

    plugins: [
      vue(),
      vueJsx(),
      // 仅在 mock 模式启用本地 mock，development/prod 走真实后端代理
      viteMockServe({
        mockPath: 'mock',
        enable: mode === 'mock',
      }),
      svgLoader(),
      // RuoYi SVG 菜单/按钮图标（sprite，<svg-icon name="...">）
      createSvgIconsPlugin({
        iconDirs: [path.resolve(__dirname, 'src/assets/icons/svg')],
        symbolId: 'icon-[name]',
      }),
    ],

    server: {
      port: Number(VITE_APP_PORT) || 3002,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        [VITE_API_URL_PREFIX]: {
          target: VITE_API_URL,
          changeOrigin: true,
          // SSE / WebSocket 统一消息推送
          ws: true,
          rewrite: (path) => path.replace(new RegExp(`^${VITE_API_URL_PREFIX}`), ''),
        },
      },
    },

    // https://github.com/vueuse/core/issues/5387#issuecomment-4734180404
    build: {
      rolldownOptions: {
        onLog(level, log, defaultHandler) {
          if (log.code === 'INVALID_ANNOTATION') return null;
          else defaultHandler(level, log);
        },
      },
    },
  };
};
