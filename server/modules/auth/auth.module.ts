import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmployeeAuthGuard } from './employee-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, EmployeeAuthGuard],
  exports: [EmployeeAuthGuard],
})
export class AuthModule {}
