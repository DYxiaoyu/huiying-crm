import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
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

const PUBLIC_UPLOAD_DIR = (process.env.UPLOAD_DIR || '/app/uploads') + '/public';

/** 公开接口：供应商提交（免登录，密钥校验，仅写入） */
@Controller('api/public/supplier')
export class SupplierPublicController {
  constructor(private readonly supplierPublicService: SupplierPublicService) {}

  @Post('apply')
  async apply(@Body() dto: PublicApplyDto): Promise<PublicApplyResponse> {
    return this.supplierPublicService.apply(dto);
  }

  /** 公开文件上传（免登录，密钥校验）：multipart 字段 file + key，单个≤200MB，直接落盘 */
  @Post('upload-file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          try {
            fs.mkdirSync(PUBLIC_UPLOAD_DIR, { recursive: true });
          } catch (e) {
            /* ignore */
          }
          cb(null, PUBLIC_UPLOAD_DIR);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 12);
          cb(null, Date.now() + '-' + randomBytes(6).toString('hex') + ext);
        },
      }),
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  async uploadFile(
    @UploadedFile()
    file: { originalname?: string; filename?: string; size?: number; mimetype?: string } | undefined,
    @Body() body: { key?: string },
  ) {
    const keyValue = (body?.key || '').trim();
    if (!keyValue) {
      throw new BadRequestException('缺少供应商密钥');
    }
    const v = await this.supplierPublicService.verifyKey(keyValue);
    if (!v.ok) {
      throw new BadRequestException('供应商密钥无效或已停用');
    }
    if (!file) {
      throw new BadRequestException('未收到文件');
    }
    return {
      url: '/uploads/public/' + file.filename,
      name: file.originalname || file.filename || 'file',
      size: file.size,
      mime: file.mimetype || 'application/octet-stream',
    };
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
