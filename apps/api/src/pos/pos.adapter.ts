/** Normalized POS sale event — adapter çıktısı */
export type PosSaleEvent = {
  externalId: string;
  amountKurus?: number;
  creditAppliedKurus?: number;
  customerPhone?: string;
  customerId?: string;
  receiptId?: string;
  lineItems?: { categoryId?: string; amountKurus: number }[];
};

/** POS webhook adapter arayüzü */
export interface PosAdapter {
  readonly provider: string;
  parseWebhook(payload: unknown): PosSaleEvent | null;
}
