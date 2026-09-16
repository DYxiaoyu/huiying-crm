import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupplierKeysService } from './supplier-keys.service';
import { EmployeeAuthGuard } from '@server/modules/auth/employee-auth.guard';
import type {
  SupplierKey,
  CreateSupplierKeyDto,
} from '@shared/api.interface';

@Controller('api/supplier-keys')
@UseGuards(EmployeeAuthGuard)
export class SupplierKeysController {
  constructor(private readonly supplierKeysService: SupplierKeysService) {}

  @Get()
  async list(): Promise<SupplierKey[]> {
    return this.supplierKeysService.list();
  }

  @Post()
  async create(@Body() dto: CreateSupplierKeyDto): Promise<SupplierKey> {
    return this.supplierKeysService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { label?: string; enabled?: boolean },
  ): Promise<SupplierKey> {
    return this.supplierKeysService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.supplierKeysService.remove(id);
  }
}
