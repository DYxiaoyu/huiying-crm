import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { followUps, customers } from '@server/database/schema';
import { OperationLogsService } from '@server/modules/operation-logs/operation-logs.service';
import type { FollowUp, CreateFollowUpDto } from '@shared/api.interface';

@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly operationLogs: OperationLogsService,
  ) {}

  /** 客户归属校验：管理员=全部（含公海）；员工=仅自己名下 */
  private customerAccess(employeeId: string, isAdmin: boolean) {
    if (isAdmin) return [];
    return [eq(customers.employeeId, employeeId)];
  }

  async listByCustomer(customerId: string, employeeId: string, isAdmin: boolean): Promise<FollowUp[]> {
    // verify customer exists and is visible to employee
    const customerRows = await this.db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(...this.customerAccess(employeeId, isAdmin), eq(customers.id, customerId), isNull(customers.deletedAt)))
      .limit(1);
    if (customerRows.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    const customerName = customerRows[0].name;

    const rows = await this.db
      .select()
      .from(followUps)
      .where(and(
        eq(followUps.customerId, customerId),
        ...(isAdmin ? [] : [eq(followUps.employeeId, employeeId)]),
      ))
      .orderBy(desc(followUps.followAt))
      .limit(100);

    return rows.map((row) => this.toFollowUpDto(row, customerName));
  }

  async create(dto: CreateFollowUpDto, employeeId: string, isAdmin: boolean, employeeName: string): Promise<FollowUp> {
    const { customerId, content, result, followAt } = dto;

    const customerList = await this.db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(...this.customerAccess(employeeId, isAdmin), eq(customers.id, customerId), isNull(customers.deletedAt)));

    if (customerList.length === 0) {
      throw new NotFoundException('客户不存在');
    }
    const customerName = customerList[0].name;

    const createdList = await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(followUps)
        .values({
          customerId,
          content,
          result: result ?? null,
          followAt: followAt ? new Date(followAt) : new Date(),
          employeeId,
        })
        .returning();

      await tx
        .update(customers)
        .set({ updatedAt: new Date() })
        .where(eq(customers.id, customerId));

      return inserted;
    });

    this.logger.log(`新增跟进记录成功 customerId=${customerId}`);
    void this.operationLogs.record({
      employeeId,
      employeeName,
      action: 'followup',
      targetType: 'followup',
      targetId: customerId,
      targetName: customerName,
      detail: `为客户「${customerName}」新增跟进：${content.slice(0, 80)}`,
    });
    return this.toFollowUpDto(createdList[0], customerName);
  }

  private toFollowUpDto(
    row: typeof followUps.$inferSelect,
    customerName: string,
  ): FollowUp {
    return {
      id: row.id,
      customerId: row.customerId,
      customerName,
      content: row.content,
      result: row.result,
      followAt: row.followAt.toISOString(),
      employeeId: row.employeeId ?? '',
      createdAt: row.createdAt.toISOString(),
    };
  }
}
