import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmployeeAuthGuard } from './employee-auth.guard';
import { AdminGuard } from './admin.guard';
import { CurrentEmployee } from './current-employee.decorator';
import type { AuthResponse, RegisterDto, LoginDto, ChangePasswordDto, Employee } from '@shared/api.interface';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 创建员工账号：仅管理员（老板）可用。
   * 员工账号统一由老板后台创建，不再开放公开注册，避免外人注册进后台。
   */
  @Post('register')
  @UseGuards(EmployeeAuthGuard, AdminGuard)
  async register(
    @Body() dto: RegisterDto,
    @CurrentEmployee() admin: Employee,
  ): Promise<AuthResponse> {
    void admin;
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  /** 修改自己的密码（需旧密码验证） */
  @Post('change-password')
  @UseGuards(EmployeeAuthGuard)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentEmployee() employee: Employee,
  ): Promise<{ success: boolean }> {
    await this.authService.changePassword(employee.id, dto.oldPassword, dto.newPassword);
    return { success: true };
  }
}
