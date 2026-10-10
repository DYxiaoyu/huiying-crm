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

/** 触发浏览器下载 Blob（带登录 token，替代 <a href> 直跳导致 401 的方式） */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** 下载供应商商品导入模板 CSV */
export async function downloadTemplate(): Promise<void> {
  try {
    const { data } = await axiosForBackend.get<Blob>('/api/suppliers/template', {
      responseType: 'blob',
    });
    saveBlob(data, 'supplier-products-import-template.csv');
  } catch (error) {
    logger.error('下载供应商导入模板失败', error as Error);
    throw error;
  }
}

/** 导出当前筛选条件下的供应商商品 CSV */
export async function downloadCsv(
  params?: Record<string, string | undefined>
): Promise<void> {
  try {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v) qs.set(k, v);
    }
    const s = qs.toString();
    const { data } = await axiosForBackend.get<Blob>(
      s ? `/api/suppliers/export/csv?${s}` : '/api/suppliers/export/csv',
      { responseType: 'blob' }
    );
    const date = new Date().toISOString().slice(0, 10);
    saveBlob(data, `supplier-products-${date}.csv`);
  } catch (error) {
    logger.error('导出供应商商品 CSV 失败', error as Error);
    throw error;
  }
}

/** 导出 ZIP：商品数据 CSV + 商品图片 + 资料附件 + 使用说明 */
export async function downloadZip(
  params?: Record<string, string | undefined>
): Promise<void> {
  try {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v) qs.set(k, v);
    }
    const s = qs.toString();
    const { data } = await axiosForBackend.get<Blob>(
      s ? `/api/suppliers/export/zip?${s}` : '/api/suppliers/export/zip',
      { responseType: 'blob' }
    );
    const date = new Date().toISOString().slice(0, 10);
    saveBlob(data, `supplier-products-${date}.zip`);
  } catch (error) {
    logger.error('导出供应商商品 ZIP 失败', error as Error);
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
