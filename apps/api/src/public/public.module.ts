import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StampsModule } from '../stamps/stamps.module';
import { TenantsModule } from '../tenants/tenants.module';
import { WalletModule } from '../wallet/wallet.module';
import { MenuModule } from '../menu/menu.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [
    TenantsModule,
    PlansModule,
    PrismaModule,
    forwardRef(() => StampsModule),
    WalletModule,
    MenuModule,
    AuthModule,
  ],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
