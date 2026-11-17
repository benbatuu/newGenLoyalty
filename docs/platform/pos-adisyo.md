# POS Adapter — Adisyo (Faz 4)

## Webhook

```
POST /pos/webhook/:integrationId
```

Header: `X-Pos-Signature` (HMAC — integration config `webhookSecret`)

## Normalize edilmiş olay

Adisyo webhook gövdesi TR alan adlarıyla parse edilir:

| Adisyo alanı | Normalize |
|--------------|-----------|
| `SiparisId` / `siparisId` / `orderId` | `externalId`, `receiptId` |
| `ToplamTutar` / `toplamTutar` | `amountKurus` (TL → kuruş) |
| `MusteriTelefon` / `telefon` | `customerPhone` (905…) |
| `Urunler[].KategoriId` | `lineItems[].categoryId` |
| `FisNo` | `receiptId` |

İç içe `siparis` / `order` objesi de desteklenir.

```json
{
  "receiptId": "unique-receipt-id",
  "amountKurus": 4750,
  "customerPhone": "905551234567",
  "categoryId": "drink"
}
```

## Akış

1. İmza doğrula → `PosWebhookEvent` kaydet
2. Müşteri bul / oluştur
3. Aktif `POINT_CARD` varsa puan kazandır (`posReceiptId` idempotency)
4. Yoksa birincil `STAMP_CARD` damga (PER_RECEIPT modunda tutar loglanır)

## Admin

`/pos` sayfasından entegrasyon oluşturun; webhook URL tenant slug ile gösterilir.
