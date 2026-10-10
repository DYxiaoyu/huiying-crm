import {
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, max } from 'drizzle-orm';
import { customers, followUps } from '@server/database/schema';
import {
  STAGE_ORDER,
  STAGE_NAMES,
  type DashboardResponse,
  type DashboardStats,
  type StageDistribution,
  type FollowUp,
  type CustomerStage,
  type Employee,
} from '@shared/api.interface';

/** 上海时区"今天结束"时刻（业务日 23:59:59，用于下次跟进到期判断） */
function endOfTodayLocal(): Date {
  const offsetMs = 8 * 60 * 60 * 1000;
  const now = new Date();
  const shifted = new Date(now.getTime() + offsetMs);
  const endUtc = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 23, 59, 59, 999),
  );
  return new Date(endUtc.getTime() - offsetMs);
}

interface CustomerBasic {
  id: string;
  stage: string;
  createdAt: Date;
  dealAmount: string | number | null;
  expectedAmount: string | number | null;
  nextFollowAt: Date | null;
}

interface LatestFollowRow {
  customerId: string;
  maxFollowAt: Date | null;
}

interface FollowUpWithCustomer {
  id: string;
  customerId: string;
  customerName: string;
  content: string;
  result: string | null;
  followAt: Date;
  employeeId: string;
  createdAt: Date;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getStats(employee: Employee): Promise<DashboardResponse> {
    const employeeId: string = employee.id;
    const isAdmin: boolean = employee.role === 'admin';

    const allCustomers: CustomerBasic[] = await this.db
      .select({
        id: customers.id,
        stage: customers.stage,
        createdAt: customers.createdAt,
        dealAmount: customers.dealAmount,
        expectedAmount: customers.expectedAmount,
        nextFollowAt: customers.nextFollowAt,
      })
      .from(customers)
      .where(isAdmin ? undefined : eq(customers.employeeId, employeeId));

    const total: number = allCustomers.length;

    const stageCounts: Record<string, number> = {};
    for (const stage of STAGE_ORDER) {
      stageCounts[stage] = 0;
    }
    for (const c of allCustomers) {
      if (stageCounts[c.stage] !== undefined) {
        stageCounts[c.stage] += 1;
      }
    }

    const overdue: number = await this.countOverdue(employeeId, isAdmin, allCustomers);

    let totalDealAmount: number = 0;
    let totalExpectedAmount: number = 0;
    let todayFollowUp: number = 0;
    const endOfToday = endOfTodayLocal();
    for (const c of allCustomers) {
      const deal = c.dealAmount === null || c.dealAmount === undefined ? 0 : Number(c.dealAmount);
      const expected = c.expectedAmount === null || c.expectedAmount === undefined ? 0 : Number(c.expectedAmount);
      totalDealAmount += deal;
      totalExpectedAmount += expected;
      if (c.nextFollowAt && c.nextFollowAt.getTime() <= endOfToday.getTime()) {
        todayFollowUp += 1;
      }
    }

    const stats: DashboardStats = {
      total,
      overdue,
      following: stageCounts.following,
      quoted: stageCounts.quoted || 0,
      negotiating: stageCounts.negotiating || 0,
      closed: stageCounts.closed,
      newCustomers: stageCounts.new,
      lost: stageCounts.lost,
      invalid: stageCounts.invalid || 0,
      duplicate: stageCounts.duplicate || 0,
      totalDealAmount,
      totalExpectedAmount,
      todayFollowUp,
    };

    const stageDistribution: StageDistribution[] = STAGE_ORDER.map((stage: CustomerStage) => ({
      stage,
      name: STAGE_NAMES[stage],
      count: stageCounts[stage],
    }));

    const recentFollowUps: FollowUp[] = await this.getRecentFollowUps(employeeId, isAdmin);

    this.logger.log(`概览统计查询成功, 员工: ${employee.username}, 客户数: ${total}`);

    return { stats, stageDistribution, recentFollowUps };
  }

  private async countOverdue(
    employeeId: string,
    isAdmin: boolean,
    allCustomers: CustomerBasic[],
  ): Promise<number> {
    if (allCustomers.length === 0) {
      return 0;
    }

    const sevenDaysAgo: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const latestFollows: LatestFollowRow[] = await this.db
      .select({
        customerId: followUps.customerId,
        maxFollowAt: max(followUps.followAt),
      })
      .from(followUps)
      .where(isAdmin ? undefined : eq(followUps.employeeId, employeeId))
      .groupBy(followUps.customerId);

    const latestFollowMap = new Map<string, Date>();
    for (const row of latestFollows) {
      if (row.maxFollowAt) {
        latestFollowMap.set(row.customerId, row.maxFollowAt);
      }
    }

    let overdueCount: number = 0;
    for (const c of allCustomers) {
      const lastFollow: Date | undefined = latestFollowMap.get(c.id);
      const reference: Date = lastFollow ?? c.createdAt;
      if (reference.getTime() < sevenDaysAgo.getTime()) {
        overdueCount += 1;
      }
    }

    return overdueCount;
  }

  private async getRecentFollowUps(employeeId: string, isAdmin: boolean): Promise<FollowUp[]> {
    const rows: FollowUpWithCustomer[] = await this.db
      .select({
        id: followUps.id,
        customerId: followUps.customerId,
        customerName: customers.name,
        content: followUps.content,
        result: followUps.result,
        followAt: followUps.followAt,
        employeeId: followUps.employeeId,
        createdAt: followUps.createdAt,
      })
      .from(followUps)
      .leftJoin(customers, eq(followUps.customerId, customers.id))
      .where(isAdmin ? undefined : eq(followUps.employeeId, employeeId))
      .orderBy(desc(followUps.followAt))
      .limit(8);

    return rows.map((row: FollowUpWithCustomer): FollowUp => ({
      id: row.id,
      customerId: row.customerId,
      customerName: row.customerName || '',
      content: row.content,
      result: row.result,
      followAt: row.followAt.toISOString(),
      employeeId: row.employeeId || employeeId,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
