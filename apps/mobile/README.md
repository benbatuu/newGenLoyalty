# Dokun & Kazan — Personel (Flutter)

Kasiyer / kafe sahibi mobil uygulaması. Müşteri uygulaması yoktur.

## Çalıştırma

API’nin `http://localhost:3001` üzerinde ayakta olduğundan emin olun.

```bash
# iOS simülatör / macOS / Chrome
cd apps/mobile
flutter run

# Android emülatör (host makine API’si)
flutter run --dart-define=API_URL=http://10.0.2.2:3001
```

Demo hesaplar: `cashier@demo-kafe.local` / `owner@demo-kafe.local` — şifre `Password123!`

## Ekranlar

- **Tezgâh** — telefon ara, kayıt, damga, ödül
- **Günlük** — bugünkü damga / ödül özeti
- **Özet** (yalnızca owner) — tenant metrikleri
