import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Employee } from '@shared/api.interface';

export const CurrentEmployee = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Employee => {
    const request = ctx.switchToHttp().getRequest();
    return request.employee as Employee;
  },
);
