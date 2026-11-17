import { Injectable } from '@nestjs/common';
import type { PosAdapter, PosSaleEvent } from './pos.adapter';

function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const v = obj[key];
    if (v == null || v === '') continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function normalizePhone(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return undefined;
  if (digits.length === 10 && digits.startsWith('5')) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `90${digits.slice(1)}`;
  return digits;
}

function amountToKurus(total: number): number | undefined {
  if (total <= 0) return undefined;
  // Adisyo genelde TL ondalıklı gönderir; büyük tam sayılar kuruş kabul edilir
  if (total < 10_000 && !Number.isInteger(total)) {
    return Math.round(total * 100);
  }
  if (total < 10_000 && total.toString().includes('.')) {
    return Math.round(total * 100);
  }
  if (total < 10_000) {
    return Math.round(total * 100);
  }
  return Math.round(total);
}

function parseLineItems(raw: unknown): PosSaleEvent['lineItems'] {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      const amount = readNumber(
        item,
        'amountKurus',
        'Tutar',
        'tutar',
        'Price',
        'price',
        'amount',
      );
      const categoryId = readString(
        item,
        'categoryId',
        'KategoriId',
        'kategoriId',
        'CategoryId',
        'category',
      );
      const amountKurus =
        amount > 0 && amount < 10_000 && !Number.isInteger(amount)
          ? Math.round(amount * 100)
          : amount > 0 && amount < 10_000
            ? Math.round(amount * 100)
            : Math.round(amount);
      if (amountKurus <= 0) return null;
      return { categoryId: categoryId || undefined, amountKurus };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  return items.length ? items : undefined;
}

/** Adisyo webhook — TR alan adları + generic fallback */
@Injectable()
export class AdisyoPosAdapter implements PosAdapter {
  readonly provider = 'adisyo';

  parseWebhook(payload: unknown): PosSaleEvent | null {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;

    const nested =
      p.order && typeof p.order === 'object'
        ? (p.order as Record<string, unknown>)
        : p.siparis && typeof p.siparis === 'object'
          ? (p.siparis as Record<string, unknown>)
          : null;

    const root = nested ?? p;

    const externalId = readString(
      root,
      'SiparisId',
      'siparisId',
      'OrderId',
      'orderId',
      'id',
      'saleId',
      'receiptId',
    );
    if (!externalId) return null;

    const total = readNumber(
      root,
      'ToplamTutar',
      'toplamTutar',
      'GenelToplam',
      'genelToplam',
      'total',
      'amount',
      'totalAmount',
    );
    const amountKurus = amountToKurus(total);

    const phoneRaw = readString(
      root,
      'MusteriTelefon',
      'musteriTelefon',
      'Telefon',
      'telefon',
      'phone',
      'customerPhone',
    );
    const customerPhone = phoneRaw ? normalizePhone(phoneRaw) : undefined;

    const lineItems = parseLineItems(
      root.Urunler ?? root.urunler ?? root.items ?? root.lineItems,
    );
    const categoryId =
      readString(
        root,
        'categoryId',
        'KategoriId',
        'kategoriId',
        'CategoryId',
      ) ||
      lineItems?.[0]?.categoryId ||
      undefined;

    return {
      externalId,
      amountKurus,
      customerPhone,
      receiptId: readString(root, 'FisNo', 'fisNo', 'receiptId') || externalId,
      lineItems,
    };
  }
}

/** Simpra POS webhook */
@Injectable()
export class SimpraPosAdapter implements PosAdapter {
  readonly provider = 'simpra';

  parseWebhook(payload: unknown): PosSaleEvent | null {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;
    const root =
      p.check && typeof p.check === 'object'
        ? (p.check as Record<string, unknown>)
        : p;

    const externalId = readString(
      root,
      'check_id',
      'checkId',
      'id',
      'sale_id',
      'saleId',
    );
    if (!externalId) return null;

    const total = readNumber(root, 'total', 'grand_total', 'amount', 'totalAmount');
    const phoneRaw = readString(
      root,
      'customer_phone',
      'customerPhone',
      'phone',
      'guest_phone',
    );

    return {
      externalId,
      amountKurus: amountToKurus(total),
      customerPhone: phoneRaw ? normalizePhone(phoneRaw) : undefined,
      receiptId: readString(root, 'receipt_no', 'receiptNo') || externalId,
      lineItems: parseLineItems(root.items ?? root.line_items ?? root.products),
    };
  }
}

/** Menulux POS webhook */
@Injectable()
export class MenuluxPosAdapter implements PosAdapter {
  readonly provider = 'menulux';

  parseWebhook(payload: unknown): PosSaleEvent | null {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;
    const root =
      p.order && typeof p.order === 'object'
        ? (p.order as Record<string, unknown>)
        : p;

    const externalId = readString(
      root,
      'orderId',
      'order_id',
      'SiparisNo',
      'id',
    );
    if (!externalId) return null;

    const total = readNumber(
      root,
      'totalPrice',
      'total_price',
      'Toplam',
      'total',
    );
    const phoneRaw = readString(
      root,
      'customerPhone',
      'customer_phone',
      'MusteriTelefon',
      'phone',
    );

    return {
      externalId,
      amountKurus: amountToKurus(total),
      customerPhone: phoneRaw ? normalizePhone(phoneRaw) : undefined,
      receiptId: externalId,
      lineItems: parseLineItems(root.items ?? root.orderItems),
    };
  }
}

/** Restajet POS webhook */
@Injectable()
export class RestajetPosAdapter implements PosAdapter {
  readonly provider = 'restajet';

  parseWebhook(payload: unknown): PosSaleEvent | null {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;
    const root =
      p.data && typeof p.data === 'object'
        ? (p.data as Record<string, unknown>)
        : p;

    const externalId = readString(
      root,
      'OrderID',
      'orderId',
      'order_id',
      'id',
    );
    if (!externalId) return null;

    const total = readNumber(root, 'TotalAmount', 'totalAmount', 'total');
    const phoneRaw = readString(
      root,
      'CustomerPhone',
      'customerPhone',
      'phone',
    );

    return {
      externalId,
      amountKurus: amountToKurus(total),
      customerPhone: phoneRaw ? normalizePhone(phoneRaw) : undefined,
      receiptId: externalId,
      lineItems: parseLineItems(root.OrderDetails ?? root.items),
    };
  }
}

/** Generic / stub adapter */
@Injectable()
export class GenericPosAdapter implements PosAdapter {
  readonly provider = 'generic';

  parseWebhook(payload: unknown): PosSaleEvent | null {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;
    const externalId = String(p.externalId ?? p.id ?? '');
    if (!externalId) return null;
    return {
      externalId,
      amountKurus: p.amountKurus ? Number(p.amountKurus) : undefined,
      creditAppliedKurus: p.creditAppliedKurus
        ? Number(p.creditAppliedKurus)
        : undefined,
      customerId: p.customerId ? String(p.customerId) : undefined,
      customerPhone: p.customerPhone ? String(p.customerPhone) : undefined,
      receiptId: p.receiptId ? String(p.receiptId) : externalId,
      lineItems: parseLineItems(p.lineItems),
    };
  }
}

export function resolvePosAdapter(
  provider: string,
  adisyo: AdisyoPosAdapter,
  simpra: SimpraPosAdapter,
  menulux: MenuluxPosAdapter,
  restajet: RestajetPosAdapter,
  generic: GenericPosAdapter,
): PosAdapter {
  if (provider === 'adisyo') return adisyo;
  if (provider === 'simpra') return simpra;
  if (provider === 'menulux') return menulux;
  if (provider === 'restajet') return restajet;
  return generic;
}

export type { PosSaleEvent };
