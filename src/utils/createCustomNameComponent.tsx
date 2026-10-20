/**
 * 后台返回的路由动态生成 name，解决 keep-alive 缓存问题。
 * 后端 RouterVo.name 形如 `User1761400000000000100`，与页面组件自身的 name（如 `SystemUser`）不一致，
 * 直接用会导致 `<keep-alive :include>` 永远匹配不上、缓存失效。
 * 这里把异步加载的页面包一层 defineComponent，并把 name 设成路由 name，使 include 命中。
 * 移植自原项目 src/utils/createCustomNameComponent.tsx
 */
import type { Component } from 'vue';
import { defineComponent, h } from 'vue';

interface Options {
  name?: string;
}

export function createCustomNameComponent(loader: () => Promise<any>, options: Options = {}): () => Promise<Component> {
  const { name } = options;
  let component: Component | null = null;
  let wrappedComponent: Component | null = null;

  const load = async () => {
    try {
      const { default: loadedComponent } = await loader();
      component = loadedComponent;
    } catch (error) {
      console.error(`Cannot resolve component ${name}, error:`, error);
    }
  };

  return async () => {
    if (!component) {
      await load();
    }

    if (!wrappedComponent) {
      wrappedComponent = defineComponent({
        name,
        render() {
          return h(component as Component);
        },
      });
    }

    return Promise.resolve(wrappedComponent);
  };
}
