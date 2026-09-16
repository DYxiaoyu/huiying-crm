import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { DatabaseModule } from './database/database.module';
import { ViewModule } from './modules/view/view.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { SupplierPublicModule } from './modules/supplier-public/supplier-public.module';
import { SupplierKeysModule } from './modules/supplier-keys/supplier-keys.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FollowUpsModule } from './modules/follow-ups/follow-ups.module';

@Module({
  imports: [
    // 独立部署版：使用标准 PostgreSQL + Drizzle，不依赖任何平台能力
    DatabaseModule,
    // ====== @route-section: business-modules START ======
    // Place all business modules here.Do NOT add fallback modules here.
    AuthModule,
    CustomersModule,
    SuppliersModule,
    SupplierPublicModule,
    SupplierKeysModule,
    DashboardModule,
    FollowUpsModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
