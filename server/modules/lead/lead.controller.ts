import { Controller, Post, Body, Logger, BadRequestException, HttpCode } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@server/database/database.module';
import { Inject } from '@nestjs/common';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { customers } from '@server/database/schema';

interface LeadDto {
  name?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
  company?: string;
  address?: string;
  requirement?: string;
  product?: string;
  budget?: string;
}

/** 公开意向客户登记接口（免登录，写入客户列表） */
@Controller('api/lead')
export class LeadController {
  private readonly logger = new Logger(LeadController.name);
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  @Post()
  @HttpCode(200)
  async submit(@Body() dto: LeadDto): Promise<{ ok: boolean }> {
    const name = (dto.name || '').trim();
    const phone = (dto.phone || '').trim();
    if (!name) throw new BadRequestException('姓名不能为空');
    if (!phone) throw new BadRequestException('手机号不能为空');
    // 通用手机号校验：+ 和数字，7~20位
    if (!/^\+?[0-9\s\-]{7,20}$/.test(phone.replace(/\s/g, ''))) {
      throw new BadRequestException('手机号格式不正确');
    }

    // 拼装备注（分行）
    const remarkLines: string[] = [];
    if (dto.company?.trim()) remarkLines.push(`公司：${dto.company.trim()}`);
    if (dto.whatsapp?.trim()) remarkLines.push(`WhatsApp：${dto.whatsapp.trim()}`);
    if (dto.telegram?.trim()) remarkLines.push(`Telegram：${dto.telegram.trim()}`);
    if (dto.email?.trim()) remarkLines.push(`邮箱：${dto.email.trim()}`);
    if (dto.address?.trim()) remarkLines.push(`地址：${dto.address.trim()}`);
    if (dto.product?.trim()) remarkLines.push(`意向产品：${dto.product.trim()}`);
    if (dto.budget?.trim()) remarkLines.push(`预算：${dto.budget.trim()}`);
    if (dto.requirement?.trim()) remarkLines.push(`需求描述：${dto.requirement.trim()}`);

    await this.db.insert(customers).values({
      name,
      phone,
      company: dto.company?.trim() || null,
      source: '网页客户',
      stage: 'new',
      remark: remarkLines.join('\n'),
    });

    this.logger.log(`新网页客户：${name} / ${phone}`);
    return { ok: true };
  }
}
