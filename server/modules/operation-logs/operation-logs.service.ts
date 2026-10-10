import {
  Injectable,
  Inject,
  Logger,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, and } from 'drizzle-orm';
import { operationLogs } from '@server/database/schema';
import type { OperationLog, OperationLogListQuery, OperationLogListResponse } from '@shared/api.interface';

/** 操作日志服务：记录"谁在什么时间对客户/跟进/联系人做了什么" */
@Injectable()
export class OperationLogsService {
  private readonly logger = new Logger(OperationLogsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * 写入一条操作日志（内部各模块调用，不抛错：日志失败不影响主流程）
   */
  async record(params: {
    employeeId: string;
    employeeName: string;
    action: string;
    targetType: string;
    targetId?: string;
    targetName?: string;
    detail?: string;
  }): Promise<void> {
    try {
      await this.db.insert(operationLogs).values({
        employeeId: params.employeeId,
        employeeName: params.employeeName || '未知',
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        targetName: params.targetName ?? null,
        detail: params.detail ?? null,
      });
    } catch (err) {
      this.logger.warn(`写入操作日志失败: ${(err as Error).message}`);
    }
  }

  async list(
    query: OperationLogListQuery,
    employeeId: string,
    isAdmin: boolean,
  ): Promise<OperationLogListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

    const conditions = [];
    if (!isAdmin) {
      conditions.push(eq(operationLogs.employeeId, employeeId));
    }
    if (query.employeeId) {
      conditions.push(eq(operationLogs.employeeId, query.employeeId));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await this.db
      .select({ count: operationLogs.id })
      .from(operationLogs)
      .where(where);

    const rows = await this.db
      .select()
      .from(operationLogs)
      .where(where)
      .orderBy(desc(operationLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      items: rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId ?? '',
        targetName: r.targetName ?? '',
        detail: r.detail,
        createdAt: r.createdAt.toISOString(),
      })),
      total: Number(total),
      page,
      pageSize,
    };
  }
}
