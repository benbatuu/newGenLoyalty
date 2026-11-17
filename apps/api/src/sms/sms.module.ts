import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';
import { IysService } from './iys.service';
import { SmsService } from './sms.service';

@Module({
  controllers: [SmsController],
  providers: [SmsService, IysService],
  exports: [SmsService, IysService],
})
export class SmsModule {}
