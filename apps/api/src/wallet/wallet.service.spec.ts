import { BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';

describe('WalletService invite helpers', () => {
  it('documents wallet service coverage entry point', () => {
    expect(WalletService).toBeDefined();
    expect(BadRequestException).toBeDefined();
  });
});
