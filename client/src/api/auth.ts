import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  AuthResponse,
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
} from '@shared/api.interface';

export async function login(dto: LoginDto): Promise<AuthResponse> {
  try {
    const { data } = await axiosForBackend.post<AuthResponse>(
      '/api/auth/login',
      dto
    );
    return data;
  } catch (error) {
    logger.error('登录失败', error as Error);
    throw error;
  }
}

export async function register(dto: RegisterDto): Promise<AuthResponse> {
  try {
    const { data } = await axiosForBackend.post<AuthResponse>(
      '/api/auth/register',
      dto
    );
    return data;
  } catch (error) {
    logger.error('注册失败', error as Error);
    throw error;
  }
}

/** 修改自己的密码 */
export async function changePassword(dto: ChangePasswordDto): Promise<{ success: boolean }> {
  try {
    const { data } = await axiosForBackend.post<{ success: boolean }>(
      '/api/auth/change-password',
      dto
    );
    return data;
  } catch (error) {
    logger.error('修改密码失败', error as Error);
    throw error;
  }
}
