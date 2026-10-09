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
  ImportCustomerItem,
  ImportResult,
  TagStat,
  BatchUpdateStageDto,
  BatchUpdateTagsDto,
  BatchDeleteDto,
  BatchResult,
  TimeRange,
} from '@shared/api.interface';

@Controller('api/customers')
@UseGuards(EmployeeAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('stage') stage?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('favoriteOnly') favoriteOnly?: string,
    @Query('tag') tag?: string,
    @Query('timeRange') timeRange?: string,
  ): Promise<CustomerListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    const stageFilter = stage && stage !== '' ? (stage as CustomerStage) : undefined;
    const safeSortBy = sortBy === 'createdAt' || sortBy === 'name'
      ? sortBy as 'createdAt' | 'name'
      : 'updatedAt';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    const safeTimeRange = ['7d', '30d', '90d', '1y'].includes(timeRange ?? '')
      ? timeRange as TimeRange
      : undefined;

    return this.customersService.list(
      {
        page: pageNum,
        pageSize: pageSizeNum,
        keyword,
        stage: stageFilter,
        sortBy: safeSortBy,
        sortOrder: safeSortOrder,
        favoriteOnly: favoriteOnly === 'true',
        tag: tag && tag !== '' ? tag : undefined,
        timeRange: safeTimeRange,
      },
      employee.id,
      employee.role === 'admin',
    );
  }

  @Get('tags')
  async getTags(
    @CurrentEmployee() employee: { id: string; role?: string },
  ): Promise<TagStat[]> {
    return this.customersService.getTags(employee.id, employee.role === 'admin');
  }

  @Post('batch/stage')
  async batchUpdateStage(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Body() dto: BatchUpdateStageDto,
  ): Promise<BatchResult> {
    return this.customersService.batchUpdateStage(dto.ids, dto.stage, employee.id, employee.role === 'admin');
  }

  @Post('batch/tags')
  async batchUpdateTags(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Body() dto: BatchUpdateTagsDto,
  ): Promise<BatchResult> {
    return this.customersService.batchUpdateTags(dto.ids, dto.tags, employee.id, employee.role === 'admin');
  }

  @Post('batch/delete')
  async batchDelete(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Body() dto: BatchDeleteDto,
  ): Promise<BatchResult> {
    return this.customersService.batchRemove(dto.ids, employee.id, employee.role === 'admin');
  }

  @Get('check-duplicate')
  async checkDuplicate(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Query('name') name?: string,
    @Query('phone') phone?: string,
    @Query('excludeId') excludeId?: string,
  ): Promise<DuplicateCheckResult> {
    return this.customersService.checkDuplicate(name, phone, excludeId, employee.id, employee.role === 'admin');
  }

  @Get('export/csv')
  async exportCsv(
    @Res() res: Response,
    @CurrentEmployee() employee: { id: string; role?: string },
    @Query('keyword') keyword?: string,
    @Query('stage') stage?: string,
    @Query('favoriteOnly') favoriteOnly?: string,
    @Query('tag') tag?: string,
    @Query('timeRange') timeRange?: string,
  ): Promise<void> {
    const stageFilter = stage && stage !== '' ? (stage as CustomerStage) : undefined;
    const safeTimeRange = ['7d', '30d', '90d', '1y'].includes(timeRange ?? '')
      ? timeRange as TimeRange
      : undefined;
    const csv = await this.customersService.exportCsv(
      {
        page: 1,
        pageSize: 100000,
        keyword,
        stage: stageFilter,
        favoriteOnly: favoriteOnly === 'true',
        tag: tag && tag !== '' ? tag : undefined,
        timeRange: safeTimeRange,
      },
      employee.id,
      employee.role === 'admin',
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="customers.csv"',
    );
    res.send(csv);
  }

  @Get('template')
  async downloadTemplate(@Res() res: Response): Promise<void> {
    const csv = this.customersService.templateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="customers-import-template.csv"',
    );
    res.send(csv);
  }

  @Get('export/backup')
  async exportBackup(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.customersService.exportBackup(employee.id, employee.role === 'admin');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="customers-backup.json"',
    );
    res.json(data);
  }

  @Post('import')
  async importCustomers(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Body() body: { items: ImportCustomerItem[] },
  ): Promise<ImportResult> {
    return this.customersService.importCustomers(body?.items ?? [], employee.id);
  }

  @Get(':id')
  async detail(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Param('id') id: string,
  ): Promise<Customer> {
    return this.customersService.detail(id, employee.id, employee.role === 'admin');
  }

  @Post()
  async create(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Body() dto: CreateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.create(dto, employee.id);
  }

  @Patch(':id')
  async update(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.update(id, dto, employee.id, employee.role === 'admin');
  }

  @Delete(':id')
  async remove(
    @CurrentEmployee() employee: { id: string; role?: string },
    @Param('id') id: string,
  ): Promise<void> {
    return this.customersService.remove(id, employee.id, employee.role === 'admin');
  }
}
