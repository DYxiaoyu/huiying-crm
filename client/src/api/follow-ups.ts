import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  CreateFollowUpDto,
  FollowUp,
} from '@shared/api.interface';

export async function listByCustomer(
  customerId: string
): Promise<FollowUp[]> {
  try {
    const { data } = await axiosForBackend.get<FollowUp[]>(
      '/api/follow-ups',
      { params: { customerId } }
    );
    return data;
  } catch (error) {
    logger.error(`获取跟进记录失败: ${customerId}`, error as Error);
    throw error;
  }
}

export async function create(dto: CreateFollowUpDto): Promise<FollowUp> {
  try {
    const { data } = await axiosForBackend.post<FollowUp>(
      '/api/follow-ups',
      dto
    );
    return data;
  } catch (error) {
    logger.error('创建跟进记录失败', error as Error);
    throw error;
  }
}
