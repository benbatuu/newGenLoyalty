import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [SmsModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
