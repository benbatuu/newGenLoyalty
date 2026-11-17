# POS adapter kurulum rehberleri

## Desteklenen sağlayıcılar

| Sağlayıcı | Kod | Durum |
|-----------|-----|--------|
| Adisyo | `adisyo` | Prod-ready |
| Simpra | `simpra` | V3 |
| Menulux | `menulux` | V3 |
| Restajet | `restajet` | V3 |
| Generic | `generic` | Esnek JSON |

## Webhook URL

```
POST {API_URL}/pos/webhook/{integrationId}
```

Admin → Ayarlar → Entegrasyonlar → POS ekle → URL kopyala.

## Generic payload örneği

```json
{
  "externalId": "sale-123",
  "amountKurus": 4500,
  "customerPhone": "905551234567",
  "receiptId": "F-001",
  "lineItems": [
    { "categoryId": "kahve", "amountKurus": 4500 }
  ]
}
```

Satış işlendiğinde tenant'ın aktif cashback/puan programına otomatik yönlendirilir.

## Simpra

Beklenen alanlar: `check_id`, `total`, `customer_phone`, `items[]`.

## Menulux

Beklenen alanlar: `order.orderId`, `order.totalPrice`, `order.customerPhone`.

## Restajet

Beklenen alanlar: `data.OrderID`, `data.TotalAmount`, `data.CustomerPhone`.
