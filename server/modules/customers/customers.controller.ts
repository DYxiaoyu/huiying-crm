import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CustomersService } from './customers.service';
import { EmployeeAuthGuard } from '@server/modules/auth/employee-auth.guard';
import { CurrentEmployee } from '@server/modules/auth/current-employee.decorator';
import type {
  Customer,
  CustomerListResponse,
  CustomerStage,
  CreateCustomerDto,
  UpdateCustomerDto,
  DuplicateCheckResult,
} from '@shared/api.interface';

@Controller('api/customers')
@UseGuards(EmployeeAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list(
    @CurrentEmployee() employee: { id: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('stage') stage?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<CustomerListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    const stageFilter = stage && stage !== '' ? (stage as CustomerStage) : undefined;
    const safeSortBy = sortBy === 'createdAt' || sortBy === 'name'
      ? sortBy as 'createdAt' | 'name'
      : 'updatedAt';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    return this.customersService.list(
      {
        page: pageNum,
        pageSize: pageSizeNum,
        keyword,
        stage: stageFilter,
        sortBy: safeSortBy,
        sortOrder: safeSortOrder,
      },
      employee.id,
    );
  }

  @Get('check-duplicate')
  async checkDuplicate(
    @CurrentEmployee() employee: { id: string },
    @Query('name') name?: string,
    @Query('phone') phone?: string,
    @Query('excludeId') excludeId?: string,
  ): Promise<DuplicateCheckResult> {
    return this.customersService.checkDuplicate(name, phone, excludeId, employee.id);
  }

  @Get('export/csv')
  async exportCsv(
    @CurrentEmployee() employee: { id: string },
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.customersService.exportCsv(employee.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="customers.csv"',
    );
    res.send(csv);
  }

  @Get('export/backup')
  async exportBackup(
    @CurrentEmployee() employee: { id: string },
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.customersService.exportBackup(employee.id);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="customers-backup.json"',
    );
    res.json(data);
  }

  @Get(':id')
  async detail(
    @CurrentEmployee() employee: { id: string },
    @Param('id') id: string,
  ): Promise<Customer> {
    return this.customersService.detail(id, employee.id);
  }

  @Post()
  async create(
    @CurrentEmployee() employee: { id: string },
    @Body() dto: CreateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.create(dto, employee.id);
  }

  @Patch(':id')
  async update(
    @CurrentEmployee() employee: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.update(id, dto, employee.id);
  }

  @Delete(':id')
  async remove(
    @CurrentEmployee() employee: { id: string },
    @Param('id') id: string,
  ): Promise<void> {
    return this.customersService.remove(id, employee.id);
  }
}
