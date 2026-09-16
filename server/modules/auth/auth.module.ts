import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmployeeAuthGuard } from './employee-auth.guard';
import { AdminGuard } from './admin.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, EmployeeAuthGuard, AdminGuard],
  exports: [EmployeeAuthGuard, AdminGuard],
})
export class AuthModule {}
