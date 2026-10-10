import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FollowUpsService } from './follow-ups.service';
import { EmployeeAuthGuard } from '@server/modules/auth/employee-auth.guard';
import { CurrentEmployee } from '@server/modules/auth/current-employee.decorator';
import type {
  FollowUp,
  CreateFollowUpDto,
  Employee,
} from '@shared/api.interface';

@Controller('api/follow-ups')
@UseGuards(EmployeeAuthGuard)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Get()
  async listByCustomer(
    @CurrentEmployee() employee: Employee,
    @Query('customerId') customerId: string,
  ): Promise<FollowUp[]> {
    return this.followUpsService.listByCustomer(customerId, employee.id, employee.role === 'admin');
  }

  @Post()
  async create(
    @CurrentEmployee() employee: Employee,
    @Body() dto: CreateFollowUpDto,
  ): Promise<FollowUp> {
    return this.followUpsService.create(dto, employee.id, employee.role === 'admin', employee.name ?? employee.username ?? '未知');
  }
}
