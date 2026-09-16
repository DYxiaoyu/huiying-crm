import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { SupplierPublicService } from './supplier-public.service';
import type {
  PublicApplyDto,
  PublicApplyResponse,
} from '@shared/api.interface';

export interface RejectedRecord {
  productName: string;
  rejectReason: string;
  updatedAt: string;
}

/** 公开接口：供应商提交（免登录，密钥校验，仅写入） */
@Controller('api/public/supplier')
export class SupplierPublicController {
  constructor(private readonly supplierPublicService: SupplierPublicService) {}

  @Post('apply')
  async apply(@Body() dto: PublicApplyDto): Promise<PublicApplyResponse> {
    return this.supplierPublicService.apply(dto);
  }

  /** 查询某密钥最近被驳回的记录（用于提交页回显理由） */
  @Get('rejected')
  async rejected(@Query('key') key?: string): Promise<RejectedRecord[]> {
    return this.supplierPublicService.rejected(key || '');
  }

  /** 校验密钥有效性 */
  @Post('verify-key')
  async verifyKey(@Body() body: { key?: string }): Promise<{ ok: boolean; label?: string }> {
    return this.supplierPublicService.verifyKey(body?.key || '');
  }
}
