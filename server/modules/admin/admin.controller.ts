import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { EmployeeAuthGuard } from '../auth/employee-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentEmployee } from '../auth/current-employee.decorator';
import type {
  AdminOverviewResponse,
  AdminEmployeeItem,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  Employee,
} from '@shared/api.interface';

@Controller('api/admin')
@UseGuards(EmployeeAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** 老板后台：全局总览 + 员工列表 */
  @Get('overview')
  async getOverview(): Promise<AdminOverviewResponse> {
    return this.adminService.getOverview();
  }

  /** 员工列表 */
  @Get('employees')
  async getEmployees(): Promise<AdminEmployeeItem[]> {
    return this.adminService.getEmployeeList();
  }

  /** 创建员工账号 */
  @Post('employees')
  async createEmployee(@Body() dto: CreateEmployeeDto): Promise<AdminEmployeeItem> {
    return this.adminService.createEmployee(dto);
  }

  /** 修改员工（改名/改角色/重置密码） */
  @Patch('employees/:id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentEmployee() operator: Employee,
  ): Promise<AdminEmployeeItem> {
    return this.adminService.updateEmployee(id, dto, operator);
  }

  /** 删除员工（名下数据转移到操作者） */
  @Delete('employees/:id')
  async deleteEmployee(
    @Param('id') id: string,
    @CurrentEmployee() operator: Employee,
  ): Promise<{ ok: boolean }> {
    await this.adminService.deleteEmployee(id, operator);
    return { ok: true };
  }
}
