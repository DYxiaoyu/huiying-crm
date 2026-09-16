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
} from '@shared/api.interface';

@Controller('api/suppliers')
@UseGuards(EmployeeAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async list(
    @CurrentEmployee() employee: { id: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('category') category?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<SupplierListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 12;
    const safeSortBy = sortBy === 'createdAt' || sortBy === 'productName' || sortBy === 'price'
      ? sortBy as 'createdAt' | 'productName' | 'price'
      : 'updatedAt';
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    return this.suppliersService.list(
      {
        page: pageNum,
        pageSize: pageSizeNum,
        keyword,
        category,
        sortBy: safeSortBy,
        sortOrder: safeSortOrder,
      },
      employee.id,
    );
  }

  @Get('categories')
  async categories(@CurrentEmployee() employee: { id: string }): Promise<string[]> {
    return this.suppliersService.categories(employee.id);
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
    @CurrentEmployee() employee: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateSupplierProductDto,
  ): Promise<SupplierProduct> {
    return this.suppliersService.update(id, dto, employee.id);
  }

  @Delete(':id')
  async remove(
    @CurrentEmployee() employee: { id: string },
    @Param('id') id: string,
  ): Promise<void> {
    return this.suppliersService.remove(id, employee.id);
  }
}
