import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  OperationLogListQuery,
  OperationLogListResponse,
} from '@shared/api.interface';

/** 获取操作日志（管理员看全员，员工看自己的） */
export async function getList(
  params: OperationLogListQuery
): Promise<OperationLogListResponse> {
  try {
    const { data } = await axiosForBackend.get<OperationLogListResponse>(
      '/api/operation-logs',
      { params }
    );
    return data;
  } catch (error) {
    logger.error('获取操作日志失败', error as Error);
    throw error;
  }
}
