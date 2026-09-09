import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { customers, followUps } from '@server/database/schema';
import { eq, and, count, desc, asc, ilike, or, max, ne, inArray } from 'drizzle-orm';
import type {
  Customer,
  CustomerListResponse,
  CustomerStage,
  CreateCustomerDto,
  UpdateCustomerDto,
  DuplicateCheckResult,
} from '@shared/api.interface';

interface ListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  stage?: CustomerStage;
  sortBy?: 'updatedAt' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(params: ListParams, employeeId: string): Promise<CustomerListResponse> {
    const { page, pageSize: rawPageSize, keyword, stage, sortBy, sortOrder } = params;
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, rawPageSize));
    const offset = (safePage - 1) * safePageSize;

    const conditions = [eq(customers.employeeId, employeeId)];
    if (keyword && keyword.trim()) {
      const pattern = `%${keyword.trim()}%`;
      conditions.push(or(
        ilike(customers.name, pattern),
        ilike(customers.phone, pattern),
        ilike(customers.company, pattern),
      ));
    }
    if (stage) {
      conditions.push(eq(customers.stage, stage));
    }
    const whereClause = and(...conditions);

    const orderCol = sortBy === 'createdAt'
      ? customers.createdAt
      : sortBy === 'name'
        ? customers.name
        : customers.updatedAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const [countResult, rows] = await Promise.all([
      this.db.select({ count: count() }).from(customers).where(whereClause),
      this.db
        .select()
        .from(customers)
        .where(whereClause)
        .orderBy(orderFn(orderCol))
        .limit(safePageSize)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const customerIds = rows.map((row: typeof customers.$inferSelect) => row.id);

    let lastFollowMap: Map<string, Date> = new Map();
    if (customerIds.length > 0) {
      const lastFollowRows = await this.db
        .select({
          customerId: followUps.customerId,
          lastFollowAt: max(followUps.followAt),
        })
        .from(followUps)
        .where(and(
          eq(followUps.employeeId, employeeId),
          inArray(followUps.customerId, customerIds),
        ))
        .groupBy(followUps.customerId);

      for (const r of lastFollowRows) {
        if (r.lastFollowAt) {
          lastFollowMap.set(r.customerId, r.lastFollowAt);
        }
      }
    }

    const now = Date.now();
    const items: Customer[] = rows.map((row: typeof customers.$inferSelect) => {
      const lastFollow = lastFollowMap.get(row.id) ?? null;
      const baseline = lastFollow ?? row.createdAt;
      const isOverdue = now - baseline.getTime() > SEVEN_DAYS_MS;
      return this.toCustomer(row, lastFollow, isOverdue);
    });

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async detail(id: string, employeeId: string): Promise<Customer> {
    const rows = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.employeeId, employeeId)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('客户不存在');
    }

    const lastFollowRows = await this.db
      .select({ lastFollowAt: max(followUps.followAt) })
      .from(followUps)
      .where(and(
        eq(followUps.customerId, id),
        eq(followUps.employeeId, employeeId),
      ));
    const lastFollow = lastFollowRows[0]?.lastFollowAt ?? null;
    const now = Date.now();
    const baseline = lastFollow ?? rows[0].createdAt;
    const isOverdue = now - baseline.getTime() > SEVEN_DAYS_MS;

    return this.toCustomer(rows[0], lastFollow, isOverdue);
  }

  async create(dto: CreateCustomerDto, employeeId: string): Promise<Customer> {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('客户姓名不能为空');
    }
    const inserted = await this.db
      .insert(customers)
      .values({
        name: dto.name.trim(),
        phone: dto.phone ?? null,
        company: dto.company ?? null,
        source: dto.source ?? null,
        stage: dto.stage ?? 'new',
        remark: dto.remark ?? null,
        employeeId,
      })
      .returning();
    this.logger.log(`创建客户成功: ${inserted[0].id}`);
    return this.toCustomer(inserted[0], null, false);
  }

  async update(id: string, dto: UpdateCustomerDto, employeeId: string): Promise<Customer> {
    const existing = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.employeeId, employeeId)))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('客户不存在');
    }

    const patch: Partial<typeof customers.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.company !== undefined) patch.company = dto.company;
    if (dto.source !== undefined) patch.source = dto.source;
    if (dto.stage !== undefined) patch.stage = dto.stage;
    if (dto.remark !== undefined) patch.remark = dto.remark;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    patch.updatedAt = new Date();

    const updated = await this.db
      .update(customers)
      .set(patch)
      .where(and(eq(customers.id, id), eq(customers.employeeId, employeeId)))
      .returning();
    this.logger.log(`更新客户成功: ${id}`);

    const lastFollowRows = await this.db
      .select({ lastFollowAt: max(followUps.followAt) })
      .from(followUps)
      .where(and(
        eq(followUps.customerId, id),
        eq(followUps.employeeId, employeeId),
      ));
    const lastFollow = lastFollowRows[0]?.lastFollowAt ?? null;
    const now = Date.now();
    const baseline = lastFollow ?? updated[0].createdAt;
    const isOverdue = now - baseline.getTime() > SEVEN_DAYS_MS;

    return this.toCustomer(updated[0], lastFollow, isOverdue);
  }

  async remove(id: string, employeeId: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.employeeId, employeeId)))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    await this.db.delete(customers).where(eq(customers.id, id));
    this.logger.log(`删除客户成功: ${id}`);
  }

  async checkDuplicate(
    name: string | undefined,
    phone: string | undefined,
    excludeId: string | undefined,
    employeeId: string,
  ): Promise<DuplicateCheckResult> {
    const conditions = [eq(customers.employeeId, employeeId)];
    const nameConditions = [...conditions];
    const phoneConditions = [...conditions];

    if (excludeId) {
      nameConditions.push(ne(customers.id, excludeId));
      phoneConditions.push(ne(customers.id, excludeId));
    }

    let duplicateName: string | undefined;
    let duplicatePhone: string | undefined;

    const queries: Promise<unknown>[] = [];

    if (name && name.trim()) {
      queries.push(
        this.db
          .select({ name: customers.name })
          .from(customers)
          .where(and(...nameConditions, eq(customers.name, name.trim())))
          .limit(1)
          .then((rows) => {
            if (rows.length > 0) duplicateName = rows[0].name;
          }),
      );
    }

    if (phone && phone.trim()) {
      queries.push(
        this.db
          .select({ phone: customers.phone })
          .from(customers)
          .where(and(...phoneConditions, eq(customers.phone, phone.trim())))
          .limit(1)
          .then((rows) => {
            if (rows.length > 0 && rows[0].phone) duplicatePhone = rows[0].phone;
          }),
      );
    }

    await Promise.all(queries);

    return {
      hasDuplicate: !!(duplicateName || duplicatePhone),
      duplicateName,
      duplicatePhone,
    };
  }

  async exportCsv(employeeId: string): Promise<string> {
    const allCustomers = await this.db
      .select()
      .from(customers)
      .where(eq(customers.employeeId, employeeId))
      .orderBy(desc(customers.updatedAt));

    const customerIds = allCustomers.map((row) => row.id);

    // get last follow-up per customer
    const lastFollowMap = new Map<string, { followAt: Date; content: string }>();
    if (customerIds.length > 0) {
      // Use a window function approach: query all follow-ups grouped by customer, take max followAt
      // Since no raw SQL, do aggregate + then fetch content in a second query per customer
      // Better: fetch all follow-ups for these customers, compute max in memory
      const allFollowUps = await this.db
        .select({
          customerId: followUps.customerId,
          followAt: followUps.followAt,
          content: followUps.content,
        })
        .from(followUps)
        .where(eq(followUps.employeeId, employeeId));

      for (const fu of allFollowUps) {
        const existing = lastFollowMap.get(fu.customerId);
        if (!existing || fu.followAt.getTime() > existing.followAt.getTime()) {
          lastFollowMap.set(fu.customerId, { followAt: fu.followAt, content: fu.content });
        }
      }
    }

    const headers = [
      '客户姓名', '电话', '公司', '来源', '阶段', '备注',
      '最近跟进时间', '最近跟进内容', '创建时间', '更新时间',
    ];

    const stageNameMap: Record<string, string> = {
      new: '新客户',
      contacted: '已联系',
      following: '跟进中',
      closed: '已成交',
      lost: '已流失',
    };

    const escapeCsv = (value: string | null): string => {
      if (value == null) return '';
      const s = String(value);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines: string[] = [headers.join(',')];
    for (const c of allCustomers) {
      const lastFollow = lastFollowMap.get(c.id);
      const row = [
        escapeCsv(c.name),
        escapeCsv(c.phone),
        escapeCsv(c.company),
        escapeCsv(c.source),
        escapeCsv(stageNameMap[c.stage] ?? c.stage),
        escapeCsv(c.remark),
        escapeCsv(lastFollow ? lastFollow.followAt.toISOString() : ''),
        escapeCsv(lastFollow ? lastFollow.content : ''),
        escapeCsv(c.createdAt.toISOString()),
        escapeCsv(c.updatedAt.toISOString()),
      ];
      lines.push(row.join(','));
    }

    return '\uFEFF' + lines.join('\r\n');
  }

  async exportBackup(employeeId: string): Promise<{
    customers: Customer[];
    followUps: Array<{
      id: string;
      customerId: string;
      content: string;
      result: string | null;
      followAt: string;
      employeeId: string;
      createdAt: string;
    }>;
    exportedAt: string;
  }> {
    const allCustomers = await this.db
      .select()
      .from(customers)
      .where(eq(customers.employeeId, employeeId))
      .orderBy(desc(customers.createdAt));

    const allFollowUps = await this.db
      .select()
      .from(followUps)
      .where(eq(followUps.employeeId, employeeId))
      .orderBy(desc(followUps.followAt));

    const customerIds = allCustomers.map((row) => row.id);
    const lastFollowMap = new Map<string, Date>();
    for (const fu of allFollowUps) {
      const existing = lastFollowMap.get(fu.customerId);
      if (!existing || fu.followAt.getTime() > existing.getTime()) {
        lastFollowMap.set(fu.customerId, fu.followAt);
      }
    }

    const now = Date.now();
    const exportedCustomers: Customer[] = allCustomers.map((row) => {
      const lastFollow = lastFollowMap.get(row.id) ?? null;
      const baseline = lastFollow ?? row.createdAt;
      const isOverdue = now - baseline.getTime() > SEVEN_DAYS_MS;
      return this.toCustomer(row, lastFollow, isOverdue);
    });

    const exportedFollowUps = allFollowUps.map((row) => ({
      id: row.id,
      customerId: row.customerId,
      content: row.content,
      result: row.result,
      followAt: row.followAt.toISOString(),
      employeeId: row.employeeId ?? '',
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      customers: exportedCustomers,
      followUps: exportedFollowUps,
      exportedAt: new Date().toISOString(),
    };
  }

  private toCustomer(
    row: typeof customers.$inferSelect,
    lastFollowAt: Date | null,
    isOverdue: boolean,
  ): Customer {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      company: row.company,
      source: row.source,
      stage: row.stage as CustomerStage,
      remark: row.remark,
      employeeId: row.employeeId ?? '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lastFollowAt: lastFollowAt ? lastFollowAt.toISOString() : null,
      isOverdue,
    };
  }
}
