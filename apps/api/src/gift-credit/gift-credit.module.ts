import { Module } from '@nestjs/common';
import { GiftCreditController } from './gift-credit.controller';
import { GiftCreditService } from './gift-credit.service';

@Module({
  controllers: [GiftCreditController],
  providers: [GiftCreditService],
  exports: [GiftCreditService],
})
export class GiftCreditModule {}
