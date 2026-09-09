import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type { DashboardResponse } from '@shared/api.interface';

export async function getStats(): Promise<DashboardResponse> {
  try {
    const { data } = await axiosForBackend.get<DashboardResponse>(
      '/api/dashboard/stats'
    );
    return data;
  } catch (error) {
    logger.error('获取概览统计失败', error as Error);
    throw error;
  }
}
