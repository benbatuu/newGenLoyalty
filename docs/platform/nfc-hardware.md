# NFC Donanım Uyumluluk (Faz 3)

## Çözüm B — Kasiyer onaylı (önerilen MVP)

1. NFC tag NDEF URL → `/nfc/tap?deviceId=...`
2. API `NfcTapEvent` oluşturur (`PENDING`)
3. Kasiyer ekranında son tap önerilir → onay → damga

## Çözüm A — Mini web

1. Tag URL müşteri telefonunu açar
2. Cihaz eşleşmesi + müşteri kimliği
3. Arka planda damga (Faz 7 VAS ile birleşir)

## Ortam

```bash
=true
=true
```

## Test

- Android Chrome NFC okuma
- iOS Safari (sınırlı — VAS gerekir, bkz. `apple-vas.md`)
