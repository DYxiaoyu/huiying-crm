import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { supplierKeys } from '@server/database/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type {
  SupplierKey,
  CreateSupplierKeyDto,
} from '@shared/api.interface';

function generateKey(): string {
  const a = randomBytes(4).toString('hex').toUpperCase();
  const b = randomBytes(4).toString('hex').toUpperCase();
  return `HYJJ-${a}-${b}`;
}

@Injectable()
export class SupplierKeysService {
  private readonly logger = new Logger(SupplierKeysService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(): Promise<SupplierKey[]> {
    const rows = await this.db
      .select()
      .from(supplierKeys)
      .orderBy(supplierKeys.createdAt);
    return rows.map((row) => this.toKey(row));
  }

  async create(dto: CreateSupplierKeyDto): Promise<SupplierKey> {
    if (!dto.label || !dto.label.trim()) {
      throw new BadRequestException('请填写密钥备注（如供应商公司名）');
    }
    let key = generateKey();
    // 防碰撞：极小概率，重试一次
    const exists = await this.db
      .select({ id: supplierKeys.id })
      .from(supplierKeys)
      .where(eq(supplierKeys.key, key))
      .limit(1);
    if (exists.length > 0) {
      key = generateKey();
    }
    const inserted = await this.db
      .insert(supplierKeys)
      .values({ key, label: dto.label.trim() })
      .returning();
    this.logger.log(`生成供应商密钥: ${inserted[0].key} (${inserted[0].label})`);
    return this.toKey(inserted[0]);
  }

  async update(
    id: string,
    patch: { label?: string; enabled?: boolean },
  ): Promise<SupplierKey> {
    const existing = await this.db
      .select()
      .from(supplierKeys)
      .where(eq(supplierKeys.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('密钥不存在');
    }
    const values: Partial<typeof supplierKeys.$inferInsert> = {};
    if (patch.label !== undefined) values.label = patch.label.trim() || existing[0].label;
    if (patch.enabled !== undefined) values.enabled = patch.enabled;
    values.updatedAt = new Date();
    const updated = await this.db
      .update(supplierKeys)
      .set(values)
      .where(eq(supplierKeys.id, id))
      .returning();
    return this.toKey(updated[0]);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(supplierKeys)
      .where(eq(supplierKeys.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('密钥不存在');
    }
    await this.db.delete(supplierKeys).where(eq(supplierKeys.id, id));
    this.logger.log(`删除供应商密钥: ${id}`);
  }

  private toKey(row: typeof supplierKeys.$inferSelect): SupplierKey {
    return {
      id: row.id,
      key: row.key,
      label: row.label,
      enabled: row.enabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
