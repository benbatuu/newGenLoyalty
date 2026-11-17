import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PlansModule } from '../plans/plans.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [MulterModule.register({ storage: undefined }), PlansModule],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
