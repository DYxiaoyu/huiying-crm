import { Global, Module } from '@nestjs/common';
import { OperationLogsController } from './operation-logs.controller';
import { OperationLogsService } from './operation-logs.service';

/**
 * 操作日志全局模块：service 全局可注入，供客户/跟进/联系人等模块记录操作
 */
@Global()
@Module({
  controllers: [OperationLogsController],
  providers: [OperationLogsService],
  exports: [OperationLogsService],
})
export class OperationLogsModule {}
