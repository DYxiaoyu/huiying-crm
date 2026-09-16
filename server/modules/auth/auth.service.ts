import {
  Injectable,
  Inject,
  Logger,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { hashSync, compareSync } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { employees } from '@server/database/schema';
import type {
  Employee,
  AuthResponse,
  RegisterDto,
  LoginDto,
} from '@shared/api.interface';

const JWT_SECRET = 'crm-jwt-secret-key-2026';
const JWT_EXPIRES_IN = '7d';
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const { name, username, password } = dto;

    if (!USERNAME_REGEX.test(username)) {
      throw new BadRequestException('用户名需为3-20位字母、数字或下划线');
    }
    if (!password || password.length < 4) {
      throw new BadRequestException('密码至少4位');
    }
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('姓名不能为空');
    }

    const existing: { id: string }[] = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.username, username));

    if (existing.length > 0) {
      throw new ConflictException('用户名已存在');
    }

    const passwordHash: string = hashSync(password, 10);

    const inserted = await this.db
      .insert(employees)
      .values({ name, username, passwordHash, role: dto.role ?? 'employee' })
      .returning({ id: employees.id, name: employees.name, username: employees.username, role: employees.role });

    const employee: Employee = {
      id: inserted[0].id,
      name: inserted[0].name,
      username: inserted[0].username,
      role: (inserted[0].role ?? 'employee') as Employee['role'],
    };

    const token: string = this.generateToken(employee);

    this.logger.log(`员工注册成功: ${username}`);

    return { token, employee };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const { username, password } = dto;

    const found = await this.db
      .select({
        id: employees.id,
        name: employees.name,
        username: employees.username,
        passwordHash: employees.passwordHash,
        role: employees.role,
      })
      .from(employees)
      .where(eq(employees.username, username));

    if (found.length === 0) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const row = found[0];
    const valid: boolean = compareSync(password, row.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const employee: Employee = {
      id: row.id,
      name: row.name,
      username: row.username,
      role: (row.role ?? 'employee') as Employee['role'],
    };

    const token: string = this.generateToken(employee);

    this.logger.log(`员工登录成功: ${username}`);

    return { token, employee };
  }

  private generateToken(employee: Employee): string {
    return sign(
      { employeeId: employee.id, username: employee.username, name: employee.name, role: employee.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );
  }
}

export { JWT_SECRET };
