import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, and } from 'drizzle-orm';
import { followUps, customers } from '@server/database/schema';
import type { FollowUp, CreateFollowUpDto } from '@shared/api.interface';

@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async listByCustomer(customerId: string, employeeId: string): Promise<FollowUp[]> {
    // verify customer exists and belongs to employee
    const customerRows = await this.db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.employeeId, employeeId)))
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
        eq(followUps.employeeId, employeeId),
      ))
      .orderBy(desc(followUps.followAt))
      .limit(100);

    return rows.map((row) => this.toFollowUpDto(row, customerName));
  }

  async create(dto: CreateFollowUpDto, employeeId: string): Promise<FollowUp> {
    const { customerId, content, result, followAt } = dto;

    const customerList = await this.db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.employeeId, employeeId)));

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
