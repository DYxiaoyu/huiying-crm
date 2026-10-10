import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { customers, employees, followUps } from '@server/database/schema';
import { eq, and, count, desc, asc, ilike, or, max, ne, inArray, gte, lte, isNotNull } from 'drizzle-orm';
import archiver from 'archiver';
import type {
  Customer,
  CustomerListResponse,
  CustomerStage,
  CreateCustomerDto,
  UpdateCustomerDto,
  DuplicateCheckResult,
  ImportCustomerItem,
  ImportResult,
  TagStat,
  BatchResult,
  TimeRange,
  CustomerAttachment,
} from '@shared/api.interface';

interface ListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  stage?: CustomerStage;
  sortBy?: 'updatedAt' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  favoriteOnly?: boolean;
  tag?: string;
  timeRange?: TimeRange;
  dueSoon?: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

/** 预置常用标签（客户可自定义新标签） */
export const PRESET_TAGS = ['重点客户', '大客户', '待回访', '已报价', '潜在客户', '黑名单'];

/** 解析 tags JSON 列 → string[] */
function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function toTagsJson(tags: string[] | undefined): string | null {
  if (!tags || !Array.isArray(tags)) return null;
  const cleaned = [...new Set(tags.map((t) => String(t).trim()).filter((t) => t.length > 0))];
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

/** 解析 attachments JSON 列 → CustomerAttachment[] */
function parseAttachments(raw: string | null): CustomerAttachment[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((x) => x && typeof x.url === 'string')
      : [];
  } catch {
    return [];
  }
}

function toAttachmentsJson(attachments: CustomerAttachment[] | undefined): string | null {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) return null;
  const cleaned = attachments
    .filter((a) => a && typeof a.url === 'string' && a.url.startsWith('/uploads/'))
    .map((a) => ({
      url: a.url,
      name: String(a.name ?? ''),
      size: Number(a.size ?? 0),
      type: String(a.type ?? ''),
      uploadedAt: a.uploadedAt ?? new Date().toISOString(),
    }));
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

/** 上海时区"今天结束"时刻（本地业务日 23:59:59，用于下次跟进到期判断） */
function endOfTodayLocal(): Date {
  const offsetMs = 8 * 60 * 60 * 1000;
  const now = new Date();
  const shifted = new Date(now.getTime() + offsetMs);
  const endUtc = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 23, 59, 59, 999),
  );
  return new Date(endUtc.getTime() - offsetMs);
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(params: ListParams, employeeId: string, isAdmin: boolean): Promise<CustomerListResponse> {
    const { page, pageSize: rawPageSize, keyword, stage, sortBy, sortOrder, favoriteOnly, tag, timeRange } = params;
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, rawPageSize));
    const offset = (safePage - 1) * safePageSize;

    const conditions = this.buildCustomerConditions(params, employeeId, isAdmin);
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
          ...this.followUpScope(isAdmin, employeeId),
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

  async detail(id: string, employeeId: string, isAdmin: boolean): Promise<Customer> {
    const rows = await this.db
      .select()
      .from(customers)
      .where(and(...this.customerScope(isAdmin, employeeId), eq(customers.id, id)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('客户不存在');
    }

    const lastFollowRows = await this.db
      .select({ lastFollowAt: max(followUps.followAt) })
      .from(followUps)
      .where(and(
        ...this.followUpScope(isAdmin, employeeId),
        eq(followUps.customerId, id),
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
        tags: toTagsJson(dto.tags),
        dealAmount: dto.dealAmount !== undefined && dto.dealAmount !== null ? String(dto.dealAmount) : null,
        expectedAmount: dto.expectedAmount !== undefined && dto.expectedAmount !== null ? String(dto.expectedAmount) : null,
        nextFollowAt: dto.nextFollowAt ? new Date(dto.nextFollowAt) : null,
        employeeId,
      })
      .returning();
    this.logger.log(`创建客户成功: ${inserted[0].id}`);
    return this.toCustomer(inserted[0], null, false);
  }

  async update(id: string, dto: UpdateCustomerDto, employeeId: string, isAdmin: boolean): Promise<Customer> {
    const existing = await this.db
      .select()
      .from(customers)
      .where(and(...this.customerScope(isAdmin, employeeId), eq(customers.id, id)))
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
    if (dto.isFavorite !== undefined) patch.isFavorite = dto.isFavorite;
    if (dto.tags !== undefined) patch.tags = toTagsJson(dto.tags);
    if (dto.dealAmount !== undefined) patch.dealAmount = dto.dealAmount === null ? null : String(dto.dealAmount);
    if (dto.expectedAmount !== undefined) patch.expectedAmount = dto.expectedAmount === null ? null : String(dto.expectedAmount);
    if (dto.nextFollowAt !== undefined) patch.nextFollowAt = dto.nextFollowAt === null ? null : new Date(dto.nextFollowAt);
    if (dto.attachments !== undefined) patch.attachments = toAttachmentsJson(dto.attachments);

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    patch.updatedAt = new Date();

    const updated = await this.db
      .update(customers)
      .set(patch)
      .where(and(...this.customerScope(isAdmin, employeeId), eq(customers.id, id)))
      .returning();
    this.logger.log(`更新客户成功: ${id}`);

    const lastFollowRows = await this.db
      .select({ lastFollowAt: max(followUps.followAt) })
      .from(followUps)
      .where(and(
        ...this.followUpScope(isAdmin, employeeId),
        eq(followUps.customerId, id),
      ));
    const lastFollow = lastFollowRows[0]?.lastFollowAt ?? null;
    const now = Date.now();
    const baseline = lastFollow ?? updated[0].createdAt;
    const isOverdue = now - baseline.getTime() > SEVEN_DAYS_MS;

    return this.toCustomer(updated[0], lastFollow, isOverdue);
  }

  async remove(id: string, employeeId: string, isAdmin: boolean): Promise<void> {
    const existing = await this.db
      .select()
      .from(customers)
      .where(and(...this.customerScope(isAdmin, employeeId), eq(customers.id, id)))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    await this.db.delete(customers).where(eq(customers.id, id));
    this.logger.log(`删除客户成功: ${id}`);
  }

  /** 标签聚合：返回可见范围内所有标签及客户数（用于筛选下拉） */
  async getTags(employeeId: string, isAdmin: boolean): Promise<TagStat[]> {
    const rows = await this.db
      .select({ tags: customers.tags })
      .from(customers)
      .where(and(...this.customerScope(isAdmin, employeeId)));
    const countMap = new Map<string, number>();
    for (const row of rows) {
      for (const tag of parseTags(row.tags)) {
        countMap.set(tag, (countMap.get(tag) ?? 0) + 1);
      }
    }
    return [...countMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** 批量修改阶段 */
  async batchUpdateStage(ids: string[], stage: CustomerStage, employeeId: string, isAdmin: boolean): Promise<BatchResult> {
    if (!ids || ids.length === 0) throw new BadRequestException('请选择客户');
    const scope = this.customerScope(isAdmin, employeeId);
    const result = await this.db
      .update(customers)
      .set({ stage, updatedAt: new Date() })
      .where(and(...scope, inArray(customers.id, ids)))
      .returning({ id: customers.id });
    this.logger.log(`批量修改阶段: ${result.length} 条 → ${stage}`);
    return { updated: result.length };
  }

  /** 批量打标签（覆盖式：以传入 tags 为准） */
  async batchUpdateTags(ids: string[], tags: string[], employeeId: string, isAdmin: boolean): Promise<BatchResult> {
    if (!ids || ids.length === 0) throw new BadRequestException('请选择客户');
    const scope = this.customerScope(isAdmin, employeeId);
    const result = await this.db
      .update(customers)
      .set({ tags: toTagsJson(tags), updatedAt: new Date() })
      .where(and(...scope, inArray(customers.id, ids)))
      .returning({ id: customers.id });
    this.logger.log(`批量打标签: ${result.length} 条`);
    return { updated: result.length };
  }

  /** 批量删除 */
  async batchRemove(ids: string[], employeeId: string, isAdmin: boolean): Promise<BatchResult> {
    if (!ids || ids.length === 0) throw new BadRequestException('请选择客户');
    const scope = this.customerScope(isAdmin, employeeId);
    const result = await this.db
      .delete(customers)
      .where(and(...scope, inArray(customers.id, ids)))
      .returning({ id: customers.id });
    this.logger.log(`批量删除客户: ${result.length} 条`);
    return { updated: result.length };
  }

  async checkDuplicate(
    name: string | undefined,
    phone: string | undefined,
    excludeId: string | undefined,
    employeeId: string,
    isAdmin: boolean,
  ): Promise<DuplicateCheckResult> {
    const conditions = [...this.customerScope(isAdmin, employeeId)];
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

  async importCustomers(items: ImportCustomerItem[], employeeId: string): Promise<ImportResult> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('没有可导入的数据');
    }
    const errors: string[] = [];
    let imported = 0;
    const validRows: Array<typeof customers.$inferInsert> = [];
    const stageSet = new Set(['new', 'contacted', 'following', 'quoted', 'negotiating', 'closed', 'lost', 'invalid', 'duplicate']);

    items.forEach((item, index) => {
      const name = item.name?.trim();
      if (!name) {
        errors.push(`第 ${index + 1} 行缺少客户姓名`);
        return;
      }
      const stage = item.stage && stageSet.has(item.stage) ? item.stage : 'new';
      validRows.push({
        name,
        phone: item.phone?.trim() || null,
        company: item.company?.trim() || null,
        source: item.source?.trim() || null,
        stage,
        remark: item.remark?.trim() || null,
        tags: toTagsJson(item.tags),
        employeeId,
      });
    });

    if (validRows.length > 0) {
      // 分批插入（每批 200 条）
      for (let i = 0; i < validRows.length; i += 200) {
        const batch = validRows.slice(i, i + 200);
        await this.db.insert(customers).values(batch);
      }
      imported = validRows.length;
    }

    this.logger.log(`导入客户成功: ${imported} 条, 跳过 ${items.length - imported} 条`);
    return { imported, skipped: items.length - imported, errors };
  }

  async exportCsv(params: ListParams, employeeId: string, isAdmin: boolean): Promise<string> {
    const conditions = this.buildCustomerConditions(params, employeeId, isAdmin);
    const allCustomers = await this.db
      .select()
      .from(customers)
      .where(and(...conditions))
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
        .where(and(...this.followUpScope(isAdmin, employeeId)));

      for (const fu of allFollowUps) {
        const existing = lastFollowMap.get(fu.customerId);
        if (!existing || fu.followAt.getTime() > existing.followAt.getTime()) {
          lastFollowMap.set(fu.customerId, { followAt: fu.followAt, content: fu.content });
        }
      }
    }

    const headers = [
      '客户姓名', '电话', '公司', '来源', '阶段', '标签', '备注',
      '最近跟进时间', '最近跟进内容', '创建时间', '更新时间',
    ];

    const stageNameMap: Record<string, string> = {
      new: '新客户',
      contacted: '已联系',
      following: '跟进中',
      quoted: '已报价',
      negotiating: '谈判中',
      closed: '已成交',
      lost: '已流失',
      invalid: '无效客户',
      duplicate: '重复客户',
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
        escapeCsv(parseTags(c.tags).join('、')),
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

  /** 导出 ZIP：客户数据 CSV + 使用说明 */
  async exportZip(
    params: ListParams,
    employeeId: string,
    isAdmin: boolean,
  ): Promise<Buffer> {
    const csv = await this.exportCsv(params, employeeId, isAdmin);
    const manifest: string[] = [
      '客户数据导出说明',
      '',
      `导出时间：${new Date().toISOString()}`,
      '',
      '客户数据.csv —— 全部客户信息（含最近跟进记录/创建时间/更新时间）',
      '',
      '说明：客户暂无独立图片/附件字段；意向表单收集的 WhatsApp/Telegram/邮箱/',
      '      地址/需求/意向产品/预算等信息按分行格式保存在"备注"列中。',
    ];
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 6 } });
      const chunks: Buffer[] = [];
      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
      archive.append(csv, { name: '客户数据.csv' });
      archive.append(manifest.join('\r\n'), { name: '使用说明.txt' });
      archive.finalize();
    });
  }

  /** 客户导入模板：表头 + 一行示例（用户照格式填写，可删除示例行） */
  templateCsv(): string {
    const headers = ['客户姓名', '电话', '公司', '来源', '阶段', '标签', '备注'];
    const example = [
      '示例客户',
      '13800000000',
      '示例公司（可选）',
      '网页客户',
      '新客户',
      '重点客户、待回访',
      '备注可留空',
    ];
    const escapeCsv = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    return (
      '\uFEFF' +
      headers.map(escapeCsv).join(',') +
      '\r\n' +
      example.map(escapeCsv).join(',')
    );
  }

  async exportBackup(employeeId: string, isAdmin: boolean): Promise<{
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
      .where(and(...this.customerScope(isAdmin, employeeId)))
      .orderBy(desc(customers.createdAt));

    const allFollowUps = await this.db
      .select()
      .from(followUps)
      .where(and(...this.followUpScope(isAdmin, employeeId)))
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

  /**
   * 客户可见范围：管理员=全部；员工=自己添加的 + 网页客户（employeeId 为空，公海共享）
   */
  /**
   * 客户可见范围：管理员=全部（含公海无主客户）；员工=仅自己名下
   * 公海客户（employeeId 为空）仅管理员可见，由管理员分配后员工可见
   */
  private customerScope(isAdmin: boolean, employeeId: string) {
    if (isAdmin) return [];
    return [eq(customers.employeeId, employeeId)];
  }

  /** 构建客户列表/导出共用的筛选条件 */
  private buildCustomerConditions(
    params: Pick<ListParams, 'keyword' | 'stage' | 'favoriteOnly' | 'tag' | 'timeRange' | 'dueSoon'>,
    employeeId: string,
    isAdmin: boolean,
  ) {
    const { keyword, stage, favoriteOnly, tag, timeRange, dueSoon } = params;
    const conditions = [...this.customerScope(isAdmin, employeeId)];
    if (keyword && keyword.trim()) {
      const pattern = `%${keyword.trim()}%`;
      conditions.push(or(
        ilike(customers.name, pattern),
        ilike(customers.phone, pattern),
        ilike(customers.company, pattern),
        ilike(customers.remark, pattern),
        ilike(customers.source, pattern),
      ));
    }
    if (stage) {
      conditions.push(eq(customers.stage, stage));
    }
    if (favoriteOnly) {
      conditions.push(eq(customers.isFavorite, true));
    }
    if (tag && tag.trim()) {
      conditions.push(ilike(customers.tags, `%"${tag.trim().replace(/"/g, '\\"')}"%`));
    }
    if (timeRange && TIME_RANGE_DAYS[timeRange]) {
      conditions.push(gte(customers.createdAt, new Date(Date.now() - TIME_RANGE_DAYS[timeRange] * 24 * 60 * 60 * 1000)));
    }
    if (dueSoon) {
      // 下次跟进时间已到（含今天之内到期），用于列表"跟进到期"提醒
      conditions.push(
        and(
          isNotNull(customers.nextFollowAt),
          lte(customers.nextFollowAt, endOfTodayLocal()),
        ),
      );
    }
    return conditions;
  }

  /**
   * 跟进记录可见范围：管理员=全部；员工=仅自己的
   */
  private followUpScope(isAdmin: boolean, employeeId: string) {
    if (isAdmin) return [];
    return [eq(followUps.employeeId, employeeId)];
  }

  /** 管理员将客户分配给指定员工（公海客户领取/转交） */
  async assign(id: string, targetEmployeeId: string, operatorId: string, isAdmin: boolean): Promise<Customer> {
    if (!isAdmin) {
      throw new ForbiddenException('仅管理员可分配客户');
    }
    if (!targetEmployeeId || !targetEmployeeId.trim()) {
      throw new BadRequestException('请选择目标员工');
    }
    const customerRows = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    if (customerRows.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    const empRows = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, targetEmployeeId.trim()))
      .limit(1);
    if (empRows.length === 0) {
      throw new BadRequestException('目标员工不存在');
    }
    const updated = await this.db
      .update(customers)
      .set({ employeeId: targetEmployeeId.trim(), updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    this.logger.log(`客户 ${id} 已由 ${operatorId} 分配给员工 ${targetEmployeeId}`);
    return this.toCustomer(updated[0], null, false);
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
      tags: parseTags(row.tags),
      employeeId: row.employeeId ?? '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lastFollowAt: lastFollowAt ? lastFollowAt.toISOString() : null,
      isOverdue,
      isFavorite: row.isFavorite ?? false,
      dealAmount: row.dealAmount !== null && row.dealAmount !== undefined
        ? Number(row.dealAmount)
        : null,
      expectedAmount: row.expectedAmount !== null && row.expectedAmount !== undefined
        ? Number(row.expectedAmount)
        : null,
      nextFollowAt: row.nextFollowAt ? row.nextFollowAt.toISOString() : null,
      attachments: parseAttachments(row.attachments),
    };
  }

  /** 上传客户附件：追加到 attachments 列表（磁盘文件由文件管理统一管理） */
  async addAttachment(
    id: string,
    file: { originalname?: string; filename?: string; size?: number; mimetype?: string },
    employeeId: string,
    isAdmin: boolean,
  ): Promise<Customer> {
    if (!file || !file.filename) {
      throw new BadRequestException('未收到文件');
    }
    const existing = await this.db
      .select()
      .from(customers)
      .where(and(...this.customerScope(isAdmin, employeeId), eq(customers.id, id)))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    const current = parseAttachments(existing[0].attachments);
    current.push({
      url: '/uploads/' + file.filename,
      name: file.originalname || file.filename,
      size: file.size ?? 0,
      type: file.mimetype ?? '',
      uploadedAt: new Date().toISOString(),
    });
    const updated = await this.db
      .update(customers)
      .set({ attachments: toAttachmentsJson(current), updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    this.logger.log(`客户 ${id} 上传附件成功: ${file.filename}`);
    return this.toCustomer(updated[0], null, false);
  }

  /** 移除客户附件引用（仅移除引用，磁盘文件保留在文件管理/回收站统一治理） */
  async removeAttachment(id: string, url: string, employeeId: string, isAdmin: boolean): Promise<Customer> {
    if (!url || !url.startsWith('/uploads/')) {
      throw new BadRequestException('无效的附件路径');
    }
    const existing = await this.db
      .select()
      .from(customers)
      .where(and(...this.customerScope(isAdmin, employeeId), eq(customers.id, id)))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    const current = parseAttachments(existing[0].attachments).filter((a) => a.url !== url);
    const updated = await this.db
      .update(customers)
      .set({ attachments: toAttachmentsJson(current), updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    this.logger.log(`客户 ${id} 移除附件引用: ${url}`);
    return this.toCustomer(updated[0], null, false);
  }
}
