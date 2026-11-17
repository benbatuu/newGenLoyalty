import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { PlansModule } from '../plans/plans.module';
import { TenantsModule } from '../tenants/tenants.module';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

@Module({
  imports: [PlansModule, CrmModule, TenantsModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
