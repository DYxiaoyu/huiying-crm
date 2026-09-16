import { Module } from '@nestjs/common';
import { SupplierPublicController } from './supplier-public.controller';
import { SupplierPublicService } from './supplier-public.service';

@Module({
  controllers: [SupplierPublicController],
  providers: [SupplierPublicService],
})
export class SupplierPublicModule {}
