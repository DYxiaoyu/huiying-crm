import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  BatchDeleteDto,
  BatchResult,
  BatchUpdateStageDto,
  BatchUpdateTagsDto,
  CreateCustomerDto,
  Customer,
  CustomerListQuery,
  CustomerListResponse,
  DuplicateCheckResult,
  ImportCustomerItem,
  ImportResult,
  TagStat,
  UpdateCustomerDto,
} from '@shared/api.interface';

export async function getList(
  params: CustomerListQuery
): Promise<CustomerListResponse> {
  try {
    const { data } = await axiosForBackend.get<CustomerListResponse>(
      '/api/customers',
      { params }
    );
    return data;
  } catch (error) {
    logger.error('获取客户列表失败', error as Error);
    throw error;
  }
}

export async function getDetail(id: string): Promise<Customer> {
  try {
    const { data } = await axiosForBackend.get<Customer>(
      `/api/customers/${id}`
    );
    return data;
  } catch (error) {
    logger.error(`获取客户详情失败: ${id}`, error as Error);
    throw error;
  }
}

export async function create(dto: CreateCustomerDto): Promise<Customer> {
  try {
    const { data } = await axiosForBackend.post<Customer>(
      '/api/customers',
      dto
    );
    return data;
  } catch (error) {
    logger.error('创建客户失败', error as Error);
    throw error;
  }
}

export async function update(
  id: string,
  dto: UpdateCustomerDto
): Promise<Customer> {
  try {
    const { data } = await axiosForBackend.patch<Customer>(
      `/api/customers/${id}`,
      dto
    );
    return data;
  } catch (error) {
    logger.error(`更新客户失败: ${id}`, error as Error);
    throw error;
  }
}

export async function remove(id: string): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/customers/${id}`);
  } catch (error) {
    logger.error(`删除客户失败: ${id}`, error as Error);
    throw error;
  }
}

export async function checkDuplicate(params: {
  name?: string;
  phone?: string;
  excludeId?: string;
}): Promise<DuplicateCheckResult> {
  try {
    const { data } = await axiosForBackend.get<DuplicateCheckResult>(
      '/api/customers/check-duplicate',
      { params }
    );
    return data;
  } catch (error) {
    logger.error('查重失败', error as Error);
    throw error;
  }
}

export function getCsvUrl(params?: Record<string, string | undefined>): string {
  if (!params) return '/api/customers/export/csv';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `/api/customers/export/csv?${s}` : '/api/customers/export/csv';
}

export function getTemplateUrl(): string {
  return '/api/customers/template';
}

export function getBackupUrl(): string {
  return '/api/customers/export/backup';
}

export async function importCustomers(
  items: ImportCustomerItem[]
): Promise<ImportResult> {
  try {
    const { data } = await axiosForBackend.post<ImportResult>(
      '/api/customers/import',
      { items }
    );
    return data;
  } catch (error) {
    logger.error('导入客户失败', error as Error);
    throw error;
  }
}

export async function getTags(): Promise<TagStat[]> {
  try {
    const { data } = await axiosForBackend.get<TagStat[]>(
      '/api/customers/tags'
    );
    return data;
  } catch (error) {
    logger.error('获取客户标签失败', error as Error);
    throw error;
  }
}

export async function batchUpdateStage(
  dto: BatchUpdateStageDto
): Promise<BatchResult> {
  try {
    const { data } = await axiosForBackend.post<BatchResult>(
      '/api/customers/batch/stage',
      dto
    );
    return data;
  } catch (error) {
    logger.error('批量修改阶段失败', error as Error);
    throw error;
  }
}

export async function batchUpdateTags(
  dto: BatchUpdateTagsDto
): Promise<BatchResult> {
  try {
    const { data } = await axiosForBackend.post<BatchResult>(
      '/api/customers/batch/tags',
      dto
    );
    return data;
  } catch (error) {
    logger.error('批量打标签失败', error as Error);
    throw error;
  }
}

export async function batchDelete(
  dto: BatchDeleteDto
): Promise<BatchResult> {
  try {
    const { data } = await axiosForBackend.post<BatchResult>(
      '/api/customers/batch/delete',
      dto
    );
    return data;
  } catch (error) {
    logger.error('批量删除客户失败', error as Error);
    throw error;
  }
}
