import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { supplierProducts } from '@server/database/schema';
import { eq, and, count, desc, asc, ilike, or } from 'drizzle-orm';
import type {
  SupplierProduct,
  SupplierListResponse,
  SupplierStatus,
  CreateSupplierProductDto,
  UpdateSupplierProductDto,
  ImportSupplierItem,
  ImportResult,
  SupplierFile,
} from '@shared/api.interface';

interface ListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  category?: string;
  status?: SupplierStatus;
  sortBy?: 'updatedAt' | 'createdAt' | 'productName' | 'price';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /**
   * 供应商商品对所有登录用户可见可搜（团队共享）
   */
  async list(params: ListParams): Promise<SupplierListResponse> {
    const { page, pageSize: rawPageSize, keyword, category, status, sortBy, sortOrder } = params;
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, rawPageSize));
    const offset = (safePage - 1) * safePageSize;

    const conditions = [];
    if (keyword && keyword.trim()) {
      const pattern = `%${keyword.trim()}%`;
      conditions.push(or(
        ilike(supplierProducts.productName, pattern),
        ilike(supplierProducts.supplierName, pattern),
        ilike(supplierProducts.category, pattern),
        ilike(supplierProducts.spec, pattern),
        ilike(supplierProducts.contactName, pattern),
        ilike(supplierProducts.contactPhone, pattern),
        ilike(supplierProducts.mainCategory, pattern),
      ));
    }
    if (category && category.trim()) {
      conditions.push(eq(supplierProducts.category, category.trim()));
    }
    if (status) {
      conditions.push(eq(supplierProducts.status, status));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderCol = sortBy === 'createdAt'
      ? supplierProducts.createdAt
      : sortBy === 'productName'
        ? supplierProducts.productName
        : sortBy === 'price'
          ? supplierProducts.price
          : supplierProducts.updatedAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const [countResult, rows, supplierRows] = await Promise.all([
      this.db.select({ count: count() }).from(supplierProducts).where(whereClause),
      this.db
        .select()
        .from(supplierProducts)
        .where(whereClause)
        .orderBy(orderFn(orderCol))
        .limit(safePageSize)
        .offset(offset),
      this.db.select({ supplierName: supplierProducts.supplierName }).from(supplierProducts),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const supplierSet = new Set<string>();
    for (const r of supplierRows) {
      if (r.supplierName) supplierSet.add(r.supplierName);
    }

    return {
      items: rows.map((row) => this.toSupplierProduct(row)),
      total,
      page: safePage,
      pageSize: safePageSize,
      supplierCount: supplierSet.size,
    };
  }

  async categories(): Promise<string[]> {
    const rows = await this.db
      .select({ category: supplierProducts.category })
      .from(supplierProducts);
    const set = new Set<string>();
    for (const r of rows) {
      if (r.category && r.category.trim()) set.add(r.category.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }

  async create(dto: CreateSupplierProductDto, employeeId: string): Promise<SupplierProduct> {
    if (!dto.productName || !dto.productName.trim()) {
      throw new BadRequestException('商品名称不能为空');
    }
    if (!dto.supplierName || !dto.supplierName.trim()) {
      throw new BadRequestException('供应商名称不能为空');
    }
    const inserted = await this.db
      .insert(supplierProducts)
      .values({
        productName: dto.productName.trim(),
        supplierName: dto.supplierName.trim(),
        category: dto.category?.trim() || null,
        price: dto.price?.trim() || null,
        unit: dto.unit?.trim() || null,
        spec: dto.spec?.trim() || null,
        imageUrl: dto.imageUrl || null,
        remark: dto.remark?.trim() || null,
        contactName: dto.contactName?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        wechat: dto.wechat?.trim() || null,
        address: dto.address?.trim() || null,
        mainCategory: dto.mainCategory?.trim() || null,
        productUrl: dto.productUrl?.trim() || null,
        status: 'approved',
        employeeId,
      })
      .returning();
    this.logger.log(`创建供应商商品成功: ${inserted[0].id}`);
    return this.toSupplierProduct(inserted[0]);
  }

  async update(id: string, dto: UpdateSupplierProductDto): Promise<SupplierProduct> {
    const existing = await this.db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('商品不存在');
    }

    const patch: Partial<typeof supplierProducts.$inferInsert> = {};
    if (dto.productName !== undefined) patch.productName = dto.productName.trim();
    if (dto.supplierName !== undefined) patch.supplierName = dto.supplierName.trim();
    if (dto.category !== undefined) patch.category = dto.category.trim() || null;
    if (dto.price !== undefined) patch.price = dto.price.trim() || null;
    if (dto.unit !== undefined) patch.unit = dto.unit.trim() || null;
    if (dto.spec !== undefined) patch.spec = dto.spec.trim() || null;
    if (dto.imageUrl !== undefined) patch.imageUrl = dto.imageUrl || null;
    if (dto.remark !== undefined) patch.remark = dto.remark.trim() || null;
    if (dto.contactName !== undefined) patch.contactName = dto.contactName.trim() || null;
    if (dto.contactPhone !== undefined) patch.contactPhone = dto.contactPhone.trim() || null;
    if (dto.wechat !== undefined) patch.wechat = dto.wechat.trim() || null;
    if (dto.address !== undefined) patch.address = dto.address.trim() || null;
    if (dto.mainCategory !== undefined) patch.mainCategory = dto.mainCategory.trim() || null;
    if (dto.productUrl !== undefined) patch.productUrl = dto.productUrl.trim() || null;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    patch.updatedAt = new Date();

    const updated = await this.db
      .update(supplierProducts)
      .set(patch)
      .where(eq(supplierProducts.id, id))
      .returning();
    this.logger.log(`更新供应商商品成功: ${id}`);
    return this.toSupplierProduct(updated[0]);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('商品不存在');
    }
    await this.db.delete(supplierProducts).where(eq(supplierProducts.id, id));
    this.logger.log(`删除供应商商品成功: ${id}`);
  }

  /** 审核通过 */
  async approve(id: string): Promise<SupplierProduct> {
    const existing = await this.db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('商品不存在');
    }
    const updated = await this.db
      .update(supplierProducts)
      .set({ status: 'approved', rejectReason: null, updatedAt: new Date() })
      .where(eq(supplierProducts.id, id))
      .returning();
    this.logger.log(`审核通过供应商商品: ${id}`);
    return this.toSupplierProduct(updated[0]);
  }

  /** 审核驳回 */
  async reject(id: string, reason: string): Promise<SupplierProduct> {
    const existing = await this.db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('商品不存在');
    }
    if (!reason || !reason.trim()) {
      throw new BadRequestException('请填写驳回理由');
    }
    const updated = await this.db
      .update(supplierProducts)
      .set({ status: 'rejected', rejectReason: reason.trim(), updatedAt: new Date() })
      .where(eq(supplierProducts.id, id))
      .returning();
    this.logger.log(`审核驳回供应商商品: ${id}`);
    return this.toSupplierProduct(updated[0]);
  }

  async importItems(items: ImportSupplierItem[], employeeId: string): Promise<ImportResult> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('没有可导入的数据');
    }
    const errors: string[] = [];
    let imported = 0;
    const validRows: Array<typeof supplierProducts.$inferInsert> = [];

    items.forEach((item, index) => {
      const productName = item.productName?.trim();
      const supplierName = item.supplierName?.trim();
      if (!productName || !supplierName) {
        errors.push(`第 ${index + 1} 行缺少商品名称或供应商名称`);
        return;
      }
      validRows.push({
        productName,
        supplierName,
        category: item.category?.trim() || null,
        price: item.price?.trim() || null,
        unit: item.unit?.trim() || null,
        spec: item.spec?.trim() || null,
        remark: item.remark?.trim() || null,
        status: 'approved',
        employeeId,
      });
    });

    if (validRows.length > 0) {
      // 分批插入（每批 200 条），避免单条超长 SQL
      for (let i = 0; i < validRows.length; i += 200) {
        const batch = validRows.slice(i, i + 200);
        await this.db.insert(supplierProducts).values(batch);
      }
      imported = validRows.length;
    }

    this.logger.log(`导入供应商商品成功: ${imported} 条, 跳过 ${items.length - imported} 条`);
    return { imported, skipped: items.length - imported, errors };
  }

  private toSupplierProduct(row: typeof supplierProducts.$inferSelect): SupplierProduct {
    let files: SupplierFile[] | null = null;
    if (row.files) {
      try {
        const parsed = JSON.parse(row.files);
        if (Array.isArray(parsed)) files = parsed as SupplierFile[];
      } catch {
        files = null;
      }
    }
    let images: string[] | null = null;
    if (row.images) {
      try {
        const parsed = JSON.parse(row.images);
        if (Array.isArray(parsed)) images = parsed as string[];
      } catch {
        images = null;
      }
    }
    return {
      id: row.id,
      productName: row.productName,
      supplierName: row.supplierName,
      category: row.category,
      price: row.price,
      unit: row.unit,
      spec: row.spec,
      imageUrl: row.imageUrl,
      images,
      remark: row.remark,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      wechat: row.wechat,
      address: row.address,
      mainCategory: row.mainCategory,
      productUrl: row.productUrl,
      files,
      status: (row.status ?? 'pending') as SupplierStatus,
      rejectReason: row.rejectReason,
      submitKey: row.submitKey,
      employeeId: row.employeeId ?? '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
