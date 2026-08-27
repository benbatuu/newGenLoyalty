/** Shared domain contracts for Dokun & Kazan */

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STORE_OWNER = 'STORE_OWNER',
  CASHIER = 'CASHIER',
}

/** Stamp source — MVP uses cashier only; nfc reserved for later */
export enum StampSource {
  CASHIER = 'cashier',
  NFC = 'nfc',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
}

/** Tek MVP paketi — online ödeme (iyzico) sonra */
export const CAFE_PLAN = {
  code: 'cafe',
  priceTry: 990,
  labelTr: 'Kafe paketi',
} as const;

export type ApiHealth = {
  status: 'ok';
  service: string;
};
