# API Versiyonlama

## `/v1` (implicit)

- `/stamps/*`, `/tenants/*`, `/wallet/*` — production V1 kaynağı
- Birincil damga akışı değişmedi

## `/programs/*`

- `=true` ile açılır
- `/programs`, `/programs/:id/points|discount|event|staff|membership`
- `/loyalty/health`

## Deprecation

V1 endpoint'leri tam oturduktan sonra 12 ay uyarı ile kaldırılacak. Şimdilik dual-write aktif (``).
