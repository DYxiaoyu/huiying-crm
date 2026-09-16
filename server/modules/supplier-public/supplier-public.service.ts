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
]);
const MAX_IMAGE_DATA = 4 * 1024 * 1024; // base64 字符串长度 ≈ 3MB 文件
const MAX_FILE_DATA = 10 * 1024 * 1024; // base64 字符串长度 ≈ 7.5MB 文件
const MAX_FILES = 5;

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
    const productName = dto.productName?.trim();
    if (!supplierName) throw new BadRequestException('请填写供应商名称');
    if (!contactName) throw new BadRequestException('请填写联系人姓名');
    if (!contactPhone) throw new BadRequestException('请填写联系电话');
    if (!productName) throw new BadRequestException('请填写商品名称');

    // 图片校验
    let imageUrl: string | null = null;
    if (dto.imageData && dto.imageData.trim()) {
      const img = dto.imageData.trim();
      if (img.length > MAX_IMAGE_DATA) {
        throw new BadRequestException('图片过大，请压缩到 3MB 以内');
      }
      const mimeMatch = img.match(/^data:([^;]+);base64,/);
      if (!mimeMatch || !IMAGE_MIME.has(mimeMatch[1])) {
        throw new BadRequestException('仅支持 jpg / png / webp / gif 图片');
      }
      imageUrl = img;
    }

    // 文件校验
    let filesJson: string | null = null;
    if (Array.isArray(dto.files) && dto.files.length > 0) {
      if (dto.files.length > MAX_FILES) {
        throw new BadRequestException(`最多上传 ${MAX_FILES} 个文件`);
      }
      const files: SupplierFile[] = [];
      for (const f of dto.files) {
        const name = f.name?.trim();
        const mime = f.mime?.trim();
        const data = f.data?.trim();
        if (!name || !mime || !data) {
          throw new BadRequestException('文件信息不完整');
        }
        if (!DOC_MIME.has(mime)) {
          throw new BadRequestException(`文件「${name}」格式不支持，仅支持 PDF / Excel / Word / CSV`);
        }
        if (data.length > MAX_FILE_DATA) {
          throw new BadRequestException(`文件「${name}」过大，请压缩到 8MB 以内`);
        }
        // 防止危险文件名
        const safeName = name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
        files.push({ name: safeName, mime, size: f.size || data.length, data });
      }
      filesJson = JSON.stringify(files);
    }

    const inserted = await this.db
      .insert(supplierProducts)
      .values({
        productName,
        supplierName,
        category: dto.mainCategory?.trim() || null,
        price: dto.price?.trim() || null,
        unit: dto.unit?.trim() || null,
        spec: dto.spec?.trim() || null,
        imageUrl,
        remark: dto.remark?.trim() || null,
        contactName,
        contactPhone,
        wechat: dto.wechat?.trim() || null,
        address: dto.address?.trim() || null,
        mainCategory: dto.mainCategory?.trim() || null,
        productUrl: dto.productUrl?.trim() || null,
        files: filesJson,
        status: 'pending',
        submitKey: keyValue,
        employeeId: null,
      })
      .returning();

    this.logger.log(`供应商公开提交成功: ${inserted[0].id} (${supplierName} / ${productName})`);
    return { ok: true, appliedId: inserted[0].id };
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
