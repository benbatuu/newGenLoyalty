import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { AppleApnsService } from './apple-apns.service';
import { ApplePassService } from './apple-pass.service';
import { BirthdayJobService } from './birthday-job.service';
import { GoogleWalletService } from './google-wallet.service';
import { PassArtService } from './pass-art.service';
import { PassKitController } from './passkit.controller';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [SmsModule],
  controllers: [WalletController, PassKitController],
  providers: [
    ApplePassService,
    AppleApnsService,
    GoogleWalletService,
    PassArtService,
    WalletService,
    BirthdayJobService,
  ],
  exports: [WalletService],
})
export class WalletModule {}
