import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { EmployeeAuthGuard } from '../auth/employee-auth.guard';
import { CurrentEmployee } from '../auth/current-employee.decorator';
import type { DashboardResponse, Employee } from '@shared/api.interface';

@Controller('api/dashboard')
@UseGuards(EmployeeAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@CurrentEmployee() employee: Employee): Promise<DashboardResponse> {
    return this.dashboardService.getStats(employee);
  }
}
