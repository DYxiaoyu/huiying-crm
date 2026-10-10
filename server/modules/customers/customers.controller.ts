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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
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
  Employee,
  CustomerContact,
  CreateContactDto,
  UpdateContactDto,
} from '@shared/api.interface';

@Controller('api/customers')
@UseGuards(EmployeeAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async list(
    @CurrentEmployee() employee: Employee,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('stage') stage?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('favoriteOnly') favoriteOnly?: string,
    @Query('tag') tag?: string,
    @Query('timeRange') timeRange?: string,
    @Query('dueSoon') dueSoon?: string,
    @Query('trashOnly') trashOnly?: string,
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
        dueSoon: dueSoon === '1' || dueSoon === 'true',
        trashOnly: trashOnly === '1' || trashOnly === 'true',
      },
      employee.id,
      employee.role === 'admin',
    );
  }

  @Get('tags')
  async getTags(
    @CurrentEmployee() employee: Employee,
  ): Promise<TagStat[]> {
    return this.customersService.getTags(employee.id, employee.role === 'admin');
  }

  @Post('batch/stage')
  async batchUpdateStage(
    @CurrentEmployee() employee: Employee,
    @Body() dto: BatchUpdateStageDto,
  ): Promise<BatchResult> {
    return this.customersService.batchUpdateStage(dto.ids, dto.stage, employee.id, employee.role === 'admin');
  }

  @Post('batch/tags')
  async batchUpdateTags(
    @CurrentEmployee() employee: Employee,
    @Body() dto: BatchUpdateTagsDto,
  ): Promise<BatchResult> {
    return this.customersService.batchUpdateTags(dto.ids, dto.tags, employee.id, employee.role === 'admin');
  }

  @Post('batch/delete')
  async batchDelete(
    @CurrentEmployee() employee: Employee,
    @Body() dto: BatchDeleteDto,
  ): Promise<BatchResult> {
    return this.customersService.batchRemove(dto.ids, employee.id, employee.role === 'admin', employee.name ?? employee.username ?? '未知');
  }

  @Get('check-duplicate')
  async checkDuplicate(
    @CurrentEmployee() employee: Employee,
    @Query('name') name?: string,
    @Query('phone') phone?: string,
    @Query('excludeId') excludeId?: string,
  ): Promise<DuplicateCheckResult> {
    return this.customersService.checkDuplicate(name, phone, excludeId, employee.id, employee.role === 'admin');
  }

  @Get('export/csv')
  async exportCsv(
    @Res() res: Response,
    @CurrentEmployee() employee: Employee,
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

  @Get('export/zip')
  async exportZip(
    @Res() res: Response,
    @CurrentEmployee() employee: Employee,
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
    const zip = await this.customersService.exportZip(
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
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="customers-${date}.zip"`,
    );
    res.send(zip);
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
    @CurrentEmployee() employee: Employee,
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
    @CurrentEmployee() employee: Employee,
    @Body() body: { items: ImportCustomerItem[] },
  ): Promise<ImportResult> {
    return this.customersService.importCustomers(body?.items ?? [], employee.id);
  }

  @Post(':id/assign')
  async assign(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
    @Body() dto: { employeeId: string },
  ): Promise<Customer> {
    return this.customersService.assign(id, dto.employeeId, employee.id, employee.role === 'admin', employee.name ?? employee.username ?? '未知');
  }

  @Get(':id')
  async detail(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
  ): Promise<Customer> {
    return this.customersService.detail(id, employee.id, employee.role === 'admin');
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = process.env.UPLOAD_DIR || '/app/uploads';
        try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 12);
        cb(null, Date.now() + '-' + randomBytes(6).toString('hex') + ext);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  async uploadAttachment(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
    @UploadedFile() file?: { originalname?: string; filename?: string; size?: number; mimetype?: string },
  ): Promise<Customer> {
    if (!file) {
      throw new BadRequestException('未收到文件（单个附件最大 50MB）');
    }
    return this.customersService.addAttachment(id, file, employee.id, employee.role === 'admin');
  }

  @Delete(':id/attachments')
  async removeAttachment(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
    @Body('url') url: string,
  ): Promise<Customer> {
    return this.customersService.removeAttachment(id, url, employee.id, employee.role === 'admin');
  }

  @Post()
  async create(
    @CurrentEmployee() employee: Employee,
    @Body() dto: CreateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.create(dto, employee.id, employee.name ?? employee.username ?? '未知');
  }

  @Patch(':id')
  async update(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.update(id, dto, employee.id, employee.role === 'admin', employee.name ?? employee.username ?? '未知');
  }

  @Delete(':id')
  async remove(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
  ): Promise<void> {
    return this.customersService.remove(id, employee.id, employee.role === 'admin', employee.name ?? employee.username ?? '未知');
  }

  // ===================== 回收站 =====================

  @Post(':id/restore')
  async restore(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
  ): Promise<Customer> {
    return this.customersService.restore(id, employee.id, employee.role === 'admin', employee.name ?? employee.username ?? '未知');
  }

  @Delete('trash/:id')
  async purge(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
  ): Promise<void> {
    return this.customersService.purge(id, employee.id, employee.role === 'admin', employee.name ?? employee.username ?? '未知');
  }

  // ===================== 客户多联系人 =====================

  @Get(':id/contacts')
  async listContacts(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
  ): Promise<CustomerContact[]> {
    return this.customersService.listContacts(id, employee.id, employee.role === 'admin');
  }

  @Post(':id/contacts')
  async addContact(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
    @Body() dto: CreateContactDto,
  ): Promise<CustomerContact> {
    return this.customersService.addContact(id, dto, employee.id, employee.role === 'admin', employee.name ?? employee.username ?? '未知');
  }

  @Patch(':id/contacts/:contactId')
  async updateContact(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
  ): Promise<CustomerContact> {
    return this.customersService.updateContact(id, contactId, dto, employee.id, employee.role === 'admin', employee.name ?? employee.username ?? '未知');
  }

  @Delete(':id/contacts/:contactId')
  async removeContact(
    @CurrentEmployee() employee: Employee,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ): Promise<void> {
    return this.customersService.removeContact(id, contactId, employee.id, employee.role === 'admin', employee.name ?? employee.username ?? '未知');
  }
}
