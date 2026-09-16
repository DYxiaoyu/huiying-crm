import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  CreateSupplierProductDto,
  ImportResult,
  ImportSupplierItem,
  SupplierListQuery,
  SupplierListResponse,
  SupplierProduct,
  UpdateSupplierProductDto,
} from '@shared/api.interface';

export async function getList(
  params: SupplierListQuery
): Promise<SupplierListResponse> {
  try {
    const { data } = await axiosForBackend.get<SupplierListResponse>(
      '/api/suppliers',
      { params }
    );
    return data;
  } catch (error) {
    logger.error('获取供应商商品列表失败', error as Error);
    throw error;
  }
}

export async function getCategories(): Promise<string[]> {
  try {
    const { data } = await axiosForBackend.get<string[]>(
      '/api/suppliers/categories'
    );
    return data;
  } catch (error) {
    logger.error('获取商品分类失败', error as Error);
    throw error;
  }
}

export async function create(dto: CreateSupplierProductDto): Promise<SupplierProduct> {
  try {
    const { data } = await axiosForBackend.post<SupplierProduct>(
      '/api/suppliers',
      dto
    );
    return data;
  } catch (error) {
    logger.error('创建供应商商品失败', error as Error);
    throw error;
  }
}

export async function update(
  id: string,
  dto: UpdateSupplierProductDto
): Promise<SupplierProduct> {
  try {
    const { data } = await axiosForBackend.patch<SupplierProduct>(
      `/api/suppliers/${id}`,
      dto
    );
    return data;
  } catch (error) {
    logger.error(`更新供应商商品失败: ${id}`, error as Error);
    throw error;
  }
}

export async function remove(id: string): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/suppliers/${id}`);
  } catch (error) {
    logger.error(`删除供应商商品失败: ${id}`, error as Error);
    throw error;
  }
}

export async function importItems(
  items: ImportSupplierItem[]
): Promise<ImportResult> {
  try {
    const { data } = await axiosForBackend.post<ImportResult>(
      '/api/suppliers/import',
      { items }
    );
    return data;
  } catch (error) {
    logger.error('导入供应商商品失败', error as Error);
    throw error;
  }
}

export async function approve(id: string): Promise<SupplierProduct> {
  try {
    const { data } = await axiosForBackend.post<SupplierProduct>(
      `/api/suppliers/${id}/approve`
    );
    return data;
  } catch (error) {
    logger.error(`审核通过失败: ${id}`, error as Error);
    throw error;
  }
}

export async function reject(id: string, reason: string): Promise<SupplierProduct> {
  try {
    const { data } = await axiosForBackend.post<SupplierProduct>(
      `/api/suppliers/${id}/reject`,
      { reason }
    );
    return data;
  } catch (error) {
    logger.error(`审核驳回失败: ${id}`, error as Error);
    throw error;
  }
}
