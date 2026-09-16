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
  BadRequestException,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { EmployeeAuthGuard } from '@server/modules/auth/employee-auth.guard';
import { CurrentEmployee } from '@server/modules/auth/current-employee.decorator';
import type {
  SupplierProduct,
  SupplierListResponse,
  CreateSupplierProductDto,
  UpdateSupplierProductDto,
  ImportSupplierItem,
  ImportResult,
  SupplierStatus,
} from '@shared/api.interface';

@Controller('api/suppliers')
@UseGuards(EmployeeAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<SupplierListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 12;
    const safeSortBy = sortBy === 'createdAt' || sortBy === 'productName' || sortBy === 'price'
      ? sortBy as 'createdAt' | 'productName' | 'price'
      : 'updatedAt';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    const safeStatus: SupplierStatus | undefined =
      status === 'pending' || status === 'approved' || status === 'rejected'
        ? (status as SupplierStatus)
        : undefined;

    return this.suppliersService.list({
      page: pageNum,
      pageSize: pageSizeNum,
      keyword,
      category,
      status: safeStatus,
      sortBy: safeSortBy,
      sortOrder: safeSortOrder,
    });
  }

  @Get('categories')
  async categories(): Promise<string[]> {
    return this.suppliersService.categories();
  }

  @Post('import')
  async importItems(
    @CurrentEmployee() employee: { id: string },
    @Body() body: { items: ImportSupplierItem[] },
  ): Promise<ImportResult> {
    return this.suppliersService.importItems(body?.items ?? [], employee.id);
  }

  @Post()
  async create(
    @CurrentEmployee() employee: { id: string },
    @Body() dto: CreateSupplierProductDto,
  ): Promise<SupplierProduct> {
    return this.suppliersService.create(dto, employee.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierProductDto,
  ): Promise<SupplierProduct> {
    return this.suppliersService.update(id, dto);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string): Promise<SupplierProduct> {
    return this.suppliersService.approve(id);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ): Promise<SupplierProduct> {
    if (!body?.reason || !body.reason.trim()) {
      throw new BadRequestException('请填写驳回理由');
    }
    return this.suppliersService.reject(id, body.reason);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.suppliersService.remove(id);
  }
}
