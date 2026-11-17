import { Module, forwardRef } from '@nestjs/common';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { SmsModule } from '../sms/sms.module';
import { AppleApnsService } from './apple-apns.service';
import { ApplePassService } from './apple-pass.service';
import { BirthdayJobService } from './birthday-job.service';
import { GoogleWalletService } from './google-wallet.service';
import { PassArtService } from './pass-art.service';
import { PassKitController } from './passkit.controller';
import { WalletController } from './wallet.controller';
import { WalletProgramService } from './wallet-program.service';
import { WalletService } from './wallet.service';

@Module({
  imports: [SmsModule, forwardRef(() => LoyaltyModule)],
  controllers: [WalletController, PassKitController],
  providers: [
    ApplePassService,
    AppleApnsService,
    GoogleWalletService,
    PassArtService,
    WalletProgramService,
    WalletService,
    BirthdayJobService,
  ],
  exports: [WalletService, WalletProgramService],
})
export class WalletModule {}
