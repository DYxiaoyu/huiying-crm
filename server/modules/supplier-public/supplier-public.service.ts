import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { supplierProducts, supplierKeys } from '@server/database/schema';
import { eq, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import type {
  PublicApplyDto,
  PublicApplyResponse,
  SupplierFile,
} from '@shared/api.interface';

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const DOC_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
]);
const MAX_IMAGE_DATA = 4 * 1024 * 1024; // base64 字符串长度 ≈ 3MB 文件
const MAX_FILE_DATA = 70 * 1024 * 1024; // base64 ≈ 50MB 文件（仅兼容旧版提交）
const MAX_FILES = 20;
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

@Injectable()
export class SupplierPublicService {
  private readonly logger = new Logger(SupplierPublicService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async apply(dto: PublicApplyDto): Promise<PublicApplyResponse> {
    const keyValue = dto.key?.trim();
    if (!keyValue) {
      throw new BadRequestException('请填写供应商密钥');
    }

    const keyRows = await this.db
      .select()
      .from(supplierKeys)
      .where(and(eq(supplierKeys.key, keyValue), eq(supplierKeys.enabled, true)))
      .limit(1);
    if (keyRows.length === 0) {
      throw new BadRequestException('供应商密钥无效或已停用，请联系合作方获取');
    }

    const supplierName = dto.supplierName?.trim();
    const contactName = dto.contactName?.trim();
    const contactPhone = dto.contactPhone?.trim();
    if (!supplierName) throw new BadRequestException('请填写供应商名称');
    if (!contactName) throw new BadRequestException('请填写联系人姓名');
    if (!contactPhone) throw new BadRequestException('请填写联系电话');

    // 图片校验：多图数组（前端已压缩）
    const IMG_LIMIT = 500;
    const IMG_PER_IMG = 180 * 1024; // 压缩后单张 base64 上限 ~130KB
    let imageList: string[] = [];
    if (Array.isArray(dto.images) && dto.images.length > 0) {
      if (dto.images.length > IMG_LIMIT) {
        throw new BadRequestException(`最多上传 ${IMG_LIMIT} 张图片`);
      }
      for (const img of dto.images) {
        const s = (img || '').trim();
        if (!s) continue;
        if (s.length > IMG_PER_IMG) {
          throw new BadRequestException('单张图片过大，请压缩后再上传');
        }
        const mimeMatch = s.match(/^data:([^;]+);base64,/);
        if (!mimeMatch || !IMAGE_MIME.has(mimeMatch[1])) {
          throw new BadRequestException('仅支持 jpg / png / webp / gif 图片');
        }
        imageList.push(s);
      }
    }
    // 兼容旧版单图
    if (dto.imageData && dto.imageData.trim() && imageList.length === 0) {
      const s = dto.imageData.trim();
      if (s.length <= MAX_IMAGE_DATA) {
        const mimeMatch = s.match(/^data:([^;]+);base64,/);
        if (mimeMatch && IMAGE_MIME.has(mimeMatch[1])) imageList.push(s);
      }
    }
    const imageUrl = imageList[0] || null;
    const imagesJson = imageList.length > 0 ? JSON.stringify(imageList) : null;

    // 文件校验：优先磁盘路径（新上传），兼容旧 base64
    let filesJson: string | null = null;
    if (Array.isArray(dto.files) && dto.files.length > 0) {
      if (dto.files.length > MAX_FILES) {
        throw new BadRequestException(`最多上传 ${MAX_FILES} 个文件`);
      }
      const files: SupplierFile[] = [];
      for (const f of dto.files) {
        const name = f.name?.trim();
        if (!name) {
          throw new BadRequestException('文件信息不完整');
        }
        // 防止危险文件名
        const safeName = name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
        const mime = f.mime?.trim() || 'application/octet-stream';
        const url = f.url?.trim();
        if (url && url.startsWith('/uploads/')) {
          // 磁盘文件（先传后存）：校验文件确实存在
          const fp = path.join(UPLOAD_DIR, path.basename(url));
          if (!fs.existsSync(fp)) {
            throw new BadRequestException(`文件「${name}」不存在，请重新上传`);
          }
          files.push({ name: safeName, mime, size: f.size || 0, url });
        } else {
          // 旧 base64 提交（兼容老版本页面）
          const data = f.data?.trim();
          if (!data) {
            throw new BadRequestException('文件信息不完整');
          }
          if (!DOC_MIME.has(mime)) {
            throw new BadRequestException(`文件「${name}」格式不支持，仅支持 PDF / Excel / Word / CSV / 压缩包`);
          }
          if (data.length > MAX_FILE_DATA) {
            throw new BadRequestException(`文件「${name}」过大，请压缩到 50MB 以内`);
          }
          files.push({ name: safeName, mime, size: f.size || data.length, data });
        }
      }
      filesJson = JSON.stringify(files);
    }

    // 商品列表：兼容旧版单商品字段
    let products: Array<{ productName?: string; price?: string; unit?: string; spec?: string; productUrl?: string; remark?: string }>;
    if (Array.isArray(dto.products) && dto.products.length > 0) {
      products = dto.products.map((p) => ({
        productName: p.productName?.trim() || undefined,
        price: p.price?.trim() || undefined,
        unit: p.unit?.trim() || undefined,
        spec: p.spec?.trim() || undefined,
        productUrl: p.productUrl?.trim() || undefined,
        remark: p.remark?.trim() || undefined,
      }));
    } else {
      products = [{
        productName: dto.productName?.trim() || undefined,
        price: dto.price?.trim() || undefined,
        unit: dto.unit?.trim() || undefined,
        spec: dto.spec?.trim() || undefined,
        productUrl: dto.productUrl?.trim() || undefined,
        remark: dto.remark?.trim() || undefined,
      }];
    }
    if (products.length === 0) products = [{}];
    // 防止商品过多
    if (products.length > 200) {
      throw new BadRequestException('一次最多提交 200 个商品');
    }

    const baseRow = {
      supplierName,
      category: dto.mainCategory?.trim() || null,
      contactName,
      contactPhone,
      wechat: dto.wechat?.trim() || null,
      address: dto.address?.trim() || null,
      mainCategory: dto.mainCategory?.trim() || null,
      files: filesJson,
      images: imagesJson,
      status: 'pending',
      submitKey: keyValue,
      employeeId: null,
    };

    let firstId: string | null = null;
    for (const p of products) {
      const inserted = await this.db
        .insert(supplierProducts)
        .values({
          ...baseRow,
          productName: p.productName || null,
          price: p.price || null,
          unit: p.unit || null,
          spec: p.spec || null,
          productUrl: p.productUrl || null,
          remark: p.remark || null,
          imageUrl,
        })
        .returning();
      if (!firstId) firstId = inserted[0].id;
    }

    this.logger.log(`供应商公开提交成功: ${firstId} (${supplierName} / ${products.length} 个商品)`);
    return { ok: true, appliedId: firstId ?? undefined };
  }

  /** 查询某密钥最近被驳回的记录（最多 3 条） */
  async rejected(keyValue: string): Promise<
    Array<{ productName: string; rejectReason: string; updatedAt: string }>
  > {
    if (!keyValue.trim()) return [];
    const rows = await this.db
      .select({
        productName: supplierProducts.productName,
        rejectReason: supplierProducts.rejectReason,
        updatedAt: supplierProducts.updatedAt,
      })
      .from(supplierProducts)
      .where(and(eq(supplierProducts.submitKey, keyValue.trim()), eq(supplierProducts.status, 'rejected')))
      .orderBy(supplierProducts.updatedAt)
      .limit(3);
    return rows
      .filter((r) => r.rejectReason)
      .map((r) => ({
        productName: r.productName,
        rejectReason: r.rejectReason ?? '',
        updatedAt: r.updatedAt.toISOString(),
      }));
  }

  /** 校验密钥有效性（用于提交页进入表单前） */
  async verifyKey(keyValue: string): Promise<{ ok: boolean; label?: string }> {
    const key = keyValue?.trim();
    if (!key) throw new BadRequestException('请填写合作密钥');
    const rows = await this.db
      .select({ label: supplierKeys.label })
      .from(supplierKeys)
      .where(and(eq(supplierKeys.key, key), eq(supplierKeys.enabled, true)))
      .limit(1);
    if (rows.length === 0) {
      throw new BadRequestException('合作密钥无效或已停用，请联系对接人确认');
    }
    return { ok: true, label: rows[0].label };
  }
}
