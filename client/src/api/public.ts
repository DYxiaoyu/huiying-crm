import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type { PublicApplyDto, PublicApplyResponse } from '@shared/api.interface';

/** 公开提交接口（无需登录，密钥校验） */
export async function applySupplier(dto: PublicApplyDto): Promise<PublicApplyResponse> {
  try {
    const { data } = await axiosForBackend.post<PublicApplyResponse>(
      '/api/public/supplier/apply',
      dto,
      { timeout: 120000 }
    );
    return data;
  } catch (error) {
    logger.error('供应商提交失败', error as Error);
    throw error;
  }
}
