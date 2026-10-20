import type { AxiosPromise } from '@/utils/api-types';
import request from '@/utils/request';

import type { MessageBoxVO } from './types';

// 查询消息中心列表
export function getMessageBox(): AxiosPromise<MessageBoxVO> {
  return request({
    url: '/resource/message/box',
    method: 'get',
  });
}
