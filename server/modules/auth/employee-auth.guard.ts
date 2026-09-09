import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { JWT_SECRET } from './auth.service';
import type { Employee } from '@shared/api.interface';

interface JwtPayload {
  employeeId: string;
  username: string;
  name: string;
}

@Injectable()
export class EmployeeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('未提供有效的认证令牌');
    }

    const token: string = authHeader.slice(7);

    try {
      const payload = verify(token, JWT_SECRET) as JwtPayload;
      const employee: Employee = {
        id: payload.employeeId,
        username: payload.username,
        name: payload.name,
      };
      request.employee = employee;
      return true;
    } catch {
      throw new UnauthorizedException('认证令牌无效或已过期');
    }
  }
}
