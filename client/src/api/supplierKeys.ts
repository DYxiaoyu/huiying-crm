import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type { SupplierKey, CreateSupplierKeyDto } from '@shared/api.interface';

export async function getKeys(): Promise<SupplierKey[]> {
  try {
    const { data } = await axiosForBackend.get<SupplierKey[]>('/api/supplier-keys');
    return data;
  } catch (error) {
    logger.error('获取供应商密钥列表失败', error as Error);
    throw error;
  }
}

export async function createKey(dto: CreateSupplierKeyDto): Promise<SupplierKey> {
  try {
    const { data } = await axiosForBackend.post<SupplierKey>('/api/supplier-keys', dto);
    return data;
  } catch (error) {
    logger.error('生成供应商密钥失败', error as Error);
    throw error;
  }
}

export async function updateKey(
  id: string,
  patch: { label?: string; enabled?: boolean }
): Promise<SupplierKey> {
  try {
    const { data } = await axiosForBackend.patch<SupplierKey>(`/api/supplier-keys/${id}`, patch);
    return data;
  } catch (error) {
    logger.error(`更新供应商密钥失败: ${id}`, error as Error);
    throw error;
  }
}

export async function deleteKey(id: string): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/supplier-keys/${id}`);
  } catch (error) {
    logger.error(`删除供应商密钥失败: ${id}`, error as Error);
    throw error;
  }
}
