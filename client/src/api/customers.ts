import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  BatchDeleteDto,
  BatchResult,
  BatchUpdateStageDto,
  BatchUpdateTagsDto,
  CreateContactDto,
  CreateCustomerDto,
  Customer,
  CustomerContact,
  CustomerListQuery,
  CustomerListResponse,
  DuplicateCheckResult,
  ImportCustomerItem,
  ImportResult,
  TagStat,
  UpdateContactDto,
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

/** 导出客户完整备份 JSON（带登录 token） */
export async function downloadBackup(): Promise<void> {
  try {
    const { data } = await axiosForBackend.get<Blob>(
      '/api/customers/export/backup',
      { responseType: 'blob' }
    );
    saveBlob(data, 'customers-backup.json');
  } catch (error) {
    logger.error('导出客户备份失败', error as Error);
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

/** 下载客户导入模板 CSV */
export async function downloadTemplate(): Promise<void> {
  try {
    const { data } = await axiosForBackend.get<Blob>('/api/customers/template', {
      responseType: 'blob',
    });
    saveBlob(data, 'customers-import-template.csv');
  } catch (error) {
    logger.error('下载客户导入模板失败', error as Error);
    throw error;
  }
}

/** 导出当前筛选条件下的客户 CSV */
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
      s ? `/api/customers/export/csv?${s}` : '/api/customers/export/csv',
      { responseType: 'blob' }
    );
    const date = new Date().toISOString().slice(0, 10);
    saveBlob(data, `customers-${date}.csv`);
  } catch (error) {
    logger.error('导出客户 CSV 失败', error as Error);
    throw error;
  }
}

/** 导出客户 ZIP：客户数据 CSV + 使用说明 */
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
      s ? `/api/customers/export/zip?${s}` : '/api/customers/export/zip',
      { responseType: 'blob' }
    );
    const date = new Date().toISOString().slice(0, 10);
    saveBlob(data, `customers-${date}.zip`);
  } catch (error) {
    logger.error('导出客户 ZIP 失败', error as Error);
    throw error;
  }
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

/** 上传客户附件（报价单/截图等，单个≤50MB） */
export async function uploadAttachment(id: string, file: File): Promise<Customer> {
  try {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await axiosForBackend.post<Customer>(
      `/api/customers/${id}/attachments`,
      fd,
    );
    return data;
  } catch (error) {
    logger.error(`上传客户附件失败: ${id}`, error as Error);
    throw error;
  }
}

/** 移除客户附件引用 */
export async function removeAttachment(id: string, url: string): Promise<Customer> {
  try {
    const { data } = await axiosForBackend.delete<Customer>(
      `/api/customers/${id}/attachments`,
      { data: { url } },
    );
    return data;
  } catch (error) {
    logger.error(`移除客户附件失败: ${id}`, error as Error);
    throw error;
  }
}

/** 从回收站恢复客户 */
export async function restoreCustomer(id: string): Promise<Customer> {
  try {
    const { data } = await axiosForBackend.post<Customer>(`/api/customers/${id}/restore`);
    return data;
  } catch (error) {
    logger.error(`恢复客户失败: ${id}`, error as Error);
    throw error;
  }
}

/** 彻底删除回收站中的客户 */
export async function purgeCustomer(id: string): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/customers/trash/${id}`);
  } catch (error) {
    logger.error(`彻底删除客户失败: ${id}`, error as Error);
    throw error;
  }
}

/** 获取客户联系人列表 */
export async function listContacts(customerId: string): Promise<CustomerContact[]> {
  try {
    const { data } = await axiosForBackend.get<CustomerContact[]>(
      `/api/customers/${customerId}/contacts`
    );
    return data;
  } catch (error) {
    logger.error(`获取联系人失败: ${customerId}`, error as Error);
    throw error;
  }
}

/** 新增客户联系人 */
export async function addContact(
  customerId: string,
  dto: CreateContactDto
): Promise<CustomerContact> {
  try {
    const { data } = await axiosForBackend.post<CustomerContact>(
      `/api/customers/${customerId}/contacts`,
      dto
    );
    return data;
  } catch (error) {
    logger.error(`新增联系人失败: ${customerId}`, error as Error);
    throw error;
  }
}

/** 更新客户联系人 */
export async function updateContact(
  customerId: string,
  contactId: string,
  dto: UpdateContactDto
): Promise<CustomerContact> {
  try {
    const { data } = await axiosForBackend.patch<CustomerContact>(
      `/api/customers/${customerId}/contacts/${contactId}`,
      dto
    );
    return data;
  } catch (error) {
    logger.error(`更新联系人失败: ${contactId}`, error as Error);
    throw error;
  }
}

/** 删除客户联系人 */
export async function removeContact(
  customerId: string,
  contactId: string
): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/customers/${customerId}/contacts/${contactId}`);
  } catch (error) {
    logger.error(`删除联系人失败: ${contactId}`, error as Error);
    throw error;
  }
}

/** 管理员将客户分配给指定员工（公海客户分配/转交） */
export async function assignCustomer(
  id: string,
  employeeId: string
): Promise<Customer> {
  try {
    const { data } = await axiosForBackend.post<Customer>(
      `/api/customers/${id}/assign`,
      { employeeId }
    );
    return data;
  } catch (error) {
    logger.error(`分配客户失败: ${id}`, error as Error);
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
