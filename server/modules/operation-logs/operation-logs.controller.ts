import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmployeeAuthGuard } from '@server/modules/auth/employee-auth.guard';
import { CurrentEmployee } from '@server/modules/auth/current-employee.decorator';
import { OperationLogsService } from './operation-logs.service';
import type { Employee, OperationLogListQuery, OperationLogListResponse } from '@shared/api.interface';

@UseGuards(EmployeeAuthGuard)
@Controller('api/operation-logs')
export class OperationLogsController {
  constructor(private readonly operationLogsService: OperationLogsService) {}

  @Get()
  async list(
    @CurrentEmployee() employee: Employee,
    @Query() query: OperationLogListQuery,
  ): Promise<OperationLogListResponse> {
    return this.operationLogsService.list(query, employee.id, employee.role === 'admin');
  }
}
