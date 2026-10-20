import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useDictStore = defineStore('dict', () => {
  const dict = ref<Map<string, DictDataOption[]>>(new Map());

  /**
   * 获取字典
   * @param key 字典 key
   */
  const getDict = (key: string): DictDataOption[] | null => {
    if (!key) {
      return null;
    }
    return dict.value.get(key) || null;
  };

  /**
   * 设置字典
   * @param key 字典 key
   * @param value 字典 value
   */
  const setDict = (key: string, value: DictDataOption[]): boolean => {
    if (!key) {
      return false;
    }
    try {
      dict.value.set(key, value);
      return true;
    } catch (e) {
      console.error('Error in setDict:', e);
      return false;
    }
  };

  /**
   * 删除字典
   * @param key
   */
  const removeDict = (key: string): boolean => {
    if (!key) {
      return false;
    }
    try {
      return dict.value.delete(key);
    } catch (e) {
      console.error('Error in removeDict:', e);
      return false;
    }
  };

  /**
   * 清空字典
   */
  const cleanDict = (): void => {
    dict.value.clear();
  };

  return {
    dict,
    getDict,
    setDict,
    removeDict,
    cleanDict,
  };
});
