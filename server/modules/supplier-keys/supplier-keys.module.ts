import { Module } from '@nestjs/common';
import { SupplierKeysController } from './supplier-keys.controller';
import { SupplierKeysService } from './supplier-keys.service';

@Module({
  controllers: [SupplierKeysController],
  providers: [SupplierKeysService],
})
export class SupplierKeysModule {}
