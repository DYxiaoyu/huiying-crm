import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, count, sql } from 'drizzle-orm';
import { hashSync } from 'bcryptjs';
import { employees, customers, followUps, supplierProducts, supplierKeys } from '@server/database/schema';
import {
  STAGE_ORDER,
  STAGE_NAMES,
  type AdminEmployeeItem,
  type AdminOverview,
  type AdminOverviewResponse,
  type CreateEmployeeDto,
  type UpdateEmployeeDto,
  type Employee,
  type EmployeeRole,
  type StageDistribution,
  type CustomerStage,
} from '@shared/api.interface';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

interface EmployeeRow {
  id: string;
  name: string;
  username: string;
  role: string;
  createdAt: Date;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /** 老板后台总览 + 员工列表（一次返回） */
  async getOverview(): Promise<AdminOverviewResponse> {
    const [customerRow, supplierRow, supplierFormRow, employeeRow, keyRow, followRow] = await Promise.all([
      this.db.select({ count: count() }).from(customers),
      this.db.select({ count: count() }).from(supplierProducts),
      this.db
        .select({ count: count() })
        .from(supplierProducts)
        .where(sql`${supplierProducts.submitKey} IS NOT NULL`),
      this.db.select({ count: count() }).from(employees),
      this.db.select({ count: count() }).from(supplierKeys),
      this.db.select({ count: count() }).from(followUps),
    ]);

    const stageRows: { stage: string; c: number }[] = await this.db
      .select({ stage: customers.stage, c: count() })
      .from(customers)
      .groupBy(customers.stage);

    const stageMap: Record<string, number> = {};
    for (const r of stageRows) {
      stageMap[r.stage] = Number(r.c);
    }

    const stageDistribution: StageDistribution[] = STAGE_ORDER.map((stage: CustomerStage) => ({
      stage,
      name: STAGE_NAMES[stage],
      count: stageMap[stage] ?? 0,
    }));

    const pendingRow = await this.db
      .select({ count: count() })
      .from(supplierProducts)
      .where(eq(supplierProducts.status, 'pending'));

    const adminRow = await this.db
      .select({ count: count() })
      .from(employees)
      .where(eq(employees.role, 'admin'));

    const overview: AdminOverview = {
      customerTotal: Number(customerRow[0]?.count ?? 0),
      customerByStage: stageDistribution,
      supplierTotal: Number(supplierRow[0]?.count ?? 0),
      supplierFormTotal: Number(supplierFormRow[0]?.count ?? 0),
      supplierPending: Number(pendingRow[0]?.count ?? 0),
      employeeTotal: Number(employeeRow[0]?.count ?? 0),
      adminTotal: Number(adminRow[0]?.count ?? 0),
      supplierKeyTotal: Number(keyRow[0]?.count ?? 0),
      followUpTotal: Number(followRow[0]?.count ?? 0),
    };

    const employeesList = await this.getEmployeeList();

    return { overview, employees: employeesList };
  }

  /** 员工列表（含名下客户数/供应商数） */
  async getEmployeeList(): Promise<AdminEmployeeItem[]> {
    const rows = await this.db
      .select({
        id: employees.id,
        name: employees.name,
        username: employees.username,
        role: employees.role,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .orderBy(employees.createdAt);

    const customerCounts = await this.db
      .select({ employeeId: customers.employeeId, c: count() })
      .from(customers)
      .groupBy(customers.employeeId);

    const supplierCounts = await this.db
      .select({ employeeId: supplierProducts.employeeId, c: count() })
      .from(supplierProducts)
      .groupBy(supplierProducts.employeeId);

    const cMap = new Map<string, number>();
    for (const r of customerCounts) {
      if (r.employeeId) cMap.set(r.employeeId, Number(r.c));
    }
    const sMap = new Map<string, number>();
    for (const r of supplierCounts) {
      if (r.employeeId) sMap.set(r.employeeId, Number(r.c));
    }

    return rows.map((row: EmployeeRow): AdminEmployeeItem => ({
      id: row.id,
      name: row.name,
      username: row.username,
      role: (row.role === 'admin' ? 'admin' : 'employee') as EmployeeRole,
      createdAt: row.createdAt.toISOString(),
      customerCount: cMap.get(row.id) ?? 0,
      supplierCount: sMap.get(row.id) ?? 0,
    }));
  }

  /** 创建员工账号（老板操作） */
  async createEmployee(dto: CreateEmployeeDto): Promise<AdminEmployeeItem> {
    const { name, username, password, role } = dto;

    if (!USERNAME_REGEX.test(username || '')) {
      throw new BadRequestException('用户名需为3-20位字母、数字或下划线');
    }
    if (!password || password.length < 4) {
      throw new BadRequestException('密码至少4位');
    }
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('姓名不能为空');
    }

    const existing = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.username, username));

    if (existing.length > 0) {
      throw new ConflictException('用户名已存在');
    }

    const passwordHash: string = hashSync(password, 10);
    const targetRole: EmployeeRole = role === 'admin' ? 'admin' : 'employee';

    const inserted = await this.db
      .insert(employees)
      .values({ name: name.trim(), username, passwordHash, role: targetRole })
      .returning({
        id: employees.id,
        name: employees.name,
        username: employees.username,
        role: employees.role,
        createdAt: employees.createdAt,
      });

    this.logger.log(`老板创建员工账号: ${username} (${targetRole})`);

    return {
      id: inserted[0].id,
      name: inserted[0].name,
      username: inserted[0].username,
      role: (inserted[0].role === 'admin' ? 'admin' : 'employee') as EmployeeRole,
      createdAt: inserted[0].createdAt.toISOString(),
      customerCount: 0,
      supplierCount: 0,
    };
  }

  /** 修改员工（改名/改角色/重置密码） */
  async updateEmployee(id: string, dto: UpdateEmployeeDto, operator: Employee): Promise<AdminEmployeeItem> {
    const target = await this.findEmployee(id);
    if (!target) {
      throw new NotFoundException('员工不存在');
    }

    const patch: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new BadRequestException('姓名不能为空');
      patch.name = dto.name.trim();
    }

    if (dto.role !== undefined) {
      const newRole: EmployeeRole = dto.role === 'admin' ? 'admin' : 'employee';
      // 不能把自己降级（避免把最后一个管理员降级导致系统无管理员）
      if (id === operator.id && newRole !== 'admin') {
        throw new ForbiddenException('不能修改自己的管理员角色');
      }
      if (newRole !== 'admin' && target.role === 'admin') {
        const adminCount = await this.countAdmins();
        if (adminCount <= 1) {
          throw new ForbiddenException('系统至少需要保留一个管理员');
        }
      }
      patch.role = newRole;
    }

    if (dto.password !== undefined) {
      if (!dto.password || dto.password.length < 4) {
        throw new BadRequestException('密码至少4位');
      }
      patch.passwordHash = hashSync(dto.password, 10);
    }

    if (Object.keys(patch).length === 0) {
      return this.toItem(target);
    }

    const updated = await this.db
      .update(employees)
      .set(patch)
      .where(eq(employees.id, id))
      .returning({
        id: employees.id,
        name: employees.name,
        username: employees.username,
        role: employees.role,
        createdAt: employees.createdAt,
      });

    this.logger.log(`老板更新员工账号: ${target.username}`);

    return this.toItem({
      id: updated[0].id,
      name: updated[0].name,
      username: updated[0].username,
      role: updated[0].role,
      createdAt: updated[0].createdAt,
    });
  }

  /** 删除员工：名下客户/跟进/供应商商品转移给操作者（数据不丢失），禁止删自己与最后的管理员 */
  async deleteEmployee(id: string, operator: Employee): Promise<void> {
    if (id === operator.id) {
      throw new ForbiddenException('不能删除自己的账号');
    }

    const target = await this.findEmployee(id);
    if (!target) {
      throw new NotFoundException('员工不存在');
    }

    if (target.role === 'admin') {
      const adminCount = await this.countAdmins();
      if (adminCount <= 1) {
        throw new ForbiddenException('系统至少需要保留一个管理员，请先将其他账号设为管理员');
      }
    }

    // 数据转移：客户/跟进/供应商商品归操作者（老板）名下，避免数据丢失
    await this.db.transaction(async (tx) => {
      await tx.update(customers).set({ employeeId: operator.id }).where(eq(customers.employeeId, id));
      await tx.update(followUps).set({ employeeId: operator.id }).where(eq(followUps.employeeId, id));
      await tx.update(supplierProducts).set({ employeeId: operator.id }).where(eq(supplierProducts.employeeId, id));
      await tx.delete(employees).where(eq(employees.id, id));
    });

    this.logger.log(`老板删除员工账号: ${target.username}（其名下数据已转移到 ${operator.username}）`);
  }

  private async findEmployee(id: string): Promise<EmployeeRow | null> {
    const rows = await this.db
      .select({
        id: employees.id,
        name: employees.name,
        username: employees.username,
        role: employees.role,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  private async countAdmins(): Promise<number> {
    const rows = await this.db
      .select({ count: count() })
      .from(employees)
      .where(eq(employees.role, 'admin'));
    return Number(rows[0]?.count ?? 0);
  }

  private toItem(row: EmployeeRow): AdminEmployeeItem {
    return {
      id: row.id,
      name: row.name,
      username: row.username,
      role: (row.role === 'admin' ? 'admin' : 'employee') as EmployeeRole,
      createdAt: row.createdAt.toISOString(),
      customerCount: 0,
      supplierCount: 0,
    };
  }
}
