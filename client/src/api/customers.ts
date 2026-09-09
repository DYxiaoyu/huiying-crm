import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  CreateCustomerDto,
  Customer,
  CustomerListQuery,
  CustomerListResponse,
  DuplicateCheckResult,
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

export function getCsvUrl(): string {
  return '/api/customers/export/csv';
}

export function getBackupUrl(): string {
  return '/api/customers/export/backup';
}
