import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import type {
  AdminOverviewResponse,
  AdminEmployeeItem,
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from '@shared/api.interface';

/** 老板后台总览 + 员工列表 */
export async function getAdminOverview(): Promise<AdminOverviewResponse> {
  try {
    const { data } = await axiosForBackend.get<AdminOverviewResponse>('/api/admin/overview');
    return data;
  } catch (error) {
    logger.error('获取老板后台数据失败', error as Error);
    throw error;
  }
}

/** 创建员工账号 */
export async function createEmployee(dto: CreateEmployeeDto): Promise<AdminEmployeeItem> {
  try {
    const { data } = await axiosForBackend.post<AdminEmployeeItem>('/api/admin/employees', dto);
    return data;
  } catch (error) {
    logger.error('创建员工账号失败', error as Error);
    throw error;
  }
}

/** 修改员工（改名/改角色/重置密码） */
export async function updateEmployee(
  id: string,
  dto: UpdateEmployeeDto
): Promise<AdminEmployeeItem> {
  try {
    const { data } = await axiosForBackend.patch<AdminEmployeeItem>(`/api/admin/employees/${id}`, dto);
    return data;
  } catch (error) {
    logger.error(`更新员工账号失败 ${id}`, error as Error);
    throw error;
  }
}

/** 删除员工（名下数据转移到操作者） */
export async function deleteEmployee(id: string): Promise<void> {
  try {
    await axiosForBackend.delete(`/api/admin/employees/${id}`);
  } catch (error) {
    logger.error(`删除员工账号失败 ${id}`, error as Error);
    throw error;
  }
}
