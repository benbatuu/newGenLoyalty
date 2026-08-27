# Smoke test listesi

Her deploy / pilot öncesi. Ortam: API + Admin (+ isteğe bağlı Flutter).

## Auth

- [ ] Login: SuperAdmin / Owner / Cashier (yanlış şifre reddedilir)
- [ ] Refresh token ile oturum yenilenir
- [ ] Rol dışı menü / route erişilemez

## Tenant & abonelik

- [ ] SuperAdmin tenant listeler / oluşturur
- [ ] Manuel ACTIVE → `subscriptionActivatedAt` doluyor
- [ ] Owner ayarında paket (₺990 / cafe) ve durum görünür
- [ ] Dondurulmuş tenant `isActive=false`

## Müşteri & damga

- [ ] Telefon ara (son haneler)
- [ ] Yeni kayıt → ilk damga + SMS mock link
- [ ] 30 sn içinde çift damga → Conflict
- [ ] Damga eşiğinde `rewardReady=true`
- [ ] Ödül kullan → stampCount=0

## Wallet

- [ ] Davet URL açılıyor (`/wallet/invite/:token`)
- [ ] Apple `.pkpass` indirilebiliyor (sertifikalar varsa)
- [ ] Google “Wallet’a ekle” JWT linki üretiliyor (issuer + SA key varsa)
- [ ] Damga sonrası Google pass sync denemesi (log)

## Yüzeyler

- [ ] Marketing: `/tr`, `/en`, fiyat, iletişim formu, KVKK
- [ ] Admin: tezgâh uçtan uca
- [ ] Flutter: login → tezgâh → günlük (owner’da özet sekmesi)

## Negatif

- [ ] NFC `source=nfc` reddedilir (MVP)
- [ ] Başka tenant’ın customerId’si ile damga → 404/forbidden
