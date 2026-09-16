import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Employee, EmployeeRole } from '@shared/api.interface';

/**
 * 管理员守卫：仅 role = admin 的登录用户可以访问。
 * 使用前提：必须先经过 EmployeeAuthGuard 解析 request.employee。
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const employee: Employee | undefined = request.employee;

    if (!employee) {
      throw new ForbiddenException('需要登录后才能访问');
    }

    if ((employee.role as EmployeeRole) !== 'admin') {
      throw new ForbiddenException('该操作仅管理员（老板）可用');
    }

    return true;
  }
}
