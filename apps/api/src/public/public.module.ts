import { Module } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [TenantsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
