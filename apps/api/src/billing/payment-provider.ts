/**
 * Online ödeme sağlayıcı sözleşmesi.
 * MVP: manuel aktivasyon (SuperAdmin). iyzico implementasyonu sonra bağlanır.
 */
export type CheckoutSessionInput = {
  tenantId: string;
  planCode: string;
  amountTry: number;
  buyerEmail: string;
  successUrl: string;
  failureUrl: string;
};

export type CheckoutSessionResult = {
  provider: string;
  checkoutUrl: string;
  externalId: string;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<CheckoutSessionResult>;
}

/** Placeholder — gerçek iyzico Checkout Form / Hosted Payment Page sonra. */
export class IyzicoPaymentProvider implements PaymentProvider {
  readonly name = 'iyzico';

  createCheckoutSession(
    _input: CheckoutSessionInput,
  ): Promise<CheckoutSessionResult> {
    return Promise.reject(
      new Error(
        'iyzico henüz bağlı değil. MVP’de abonelik SuperAdmin tarafından manuel ACTIVE yapılır.',
      ),
    );
  }
}

export const CAFE_PLAN = {
  code: 'cafe',
  priceTry: 990,
  labelTr: 'Kafe paketi',
} as const;
