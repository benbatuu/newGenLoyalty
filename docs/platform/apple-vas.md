# Apple VAS (Faz 7)

## Önkoşul

Apple Developer **VAS** yetkilendirme başvurusu (paralel track Faz 3 NFC'den itibaren).

## Akış

1. Pass NFC payload yapılandırması (`passkit-generator`)
2. Kasada pass okuma → otomatik damga/puan
3. VAS yokken fallback: Faz 3 NFC kasiyer onay akışı

## Durum

Altyapı hazır (`NfcModule`, `StampSource.nfc`). VAS sertifikası gelene kadar `` ile Çözüm B kullanın.
