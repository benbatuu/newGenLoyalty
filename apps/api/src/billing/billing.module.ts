import { Module } from '@nestjs/common';
import { IyzicoPaymentProvider } from './payment-provider';

@Module({
  providers: [
    {
      provide: 'PAYMENT_PROVIDER',
      useClass: IyzicoPaymentProvider,
    },
  ],
  exports: ['PAYMENT_PROVIDER'],
})
export class BillingModule {}
