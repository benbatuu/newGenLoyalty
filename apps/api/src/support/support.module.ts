import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantsModule } from '../tenants/tenants.module';
import { PublicSupportController, SupportAdminController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [PrismaModule, TenantsModule, AuthModule],
  controllers: [PublicSupportController, SupportAdminController],
  providers: [SupportService],
})
export class SupportModule {}
