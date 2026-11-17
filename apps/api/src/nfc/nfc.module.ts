import { Module } from '@nestjs/common';
import { StampsModule } from '../stamps/stamps.module';
import { NfcController } from './nfc.controller';
import { NfcService } from './nfc.service';

@Module({
  imports: [StampsModule],
  controllers: [NfcController],
  providers: [NfcService],
  exports: [NfcService],
})
export class NfcModule {}
