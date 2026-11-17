# Dokun & Kazan — Personel (Flutter)

Kasiyer / kafe sahibi mobil uygulaması. Müşteri uygulaması yoktur.

## Çalıştırma

API'nin ayakta olduğundan emin olun.

```bash
# iOS simülatör / macOS / Chrome (localhost API)
cd apps/mobile
flutter run --dart-define=API_URL=http://localhost:3001

# Android emülatör (host makine API'si)
flutter run --dart-define=API_URL=http://10.0.2.2:3001

# Fiziksel cihaz (aynı Wi‑Fi, bilgisayar IP'niz)
flutter run --dart-define=API_URL=http://192.168.x.x:3001
```

Production build varsayılan API: `https://newgenloyalty.onrender.com` (`lib/config.dart`).

## Demo hesaplar (yalnızca debug build)

`cashier@demo-kafe.local` / `owner@demo-kafe.local` — şifre `Password123!`

Release build'de giriş alanları boş gelir.

## Ekranlar

- **Tezgâh** — telefon ara, kayıt, damga, ödül, QR scan
- **Özet** (yalnızca owner) — tenant metrikleri
- **Müşteriler** — müşteri listesi ve detay
- **Bildirimler** — Wallet broadcast
- **Profil** — abonelik, program kartları, ekip, raporlar

## Test

```bash
cd apps/mobile
flutter analyze
flutter test
```
