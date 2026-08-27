# Pilot onboarding checklist

Yeni bir kafe (tenant) canlıya alınırken sırayla işaretleyin.

## 1. Platform (SuperAdmin)

- [ ] Admin panele `admin@…` ile giriş
- [ ] **Kafeler → Yeni kafe**: isim, slug, owner e-posta/şifre
- [ ] Owner’a geçici şifreyi güvenli kanaldan ilet
- [ ] Abonelik durumunu pilot için **ACTIVE** yap (**Manuel aktifleştir**)
- [ ] Gerekirse tenant’ı dondur/aç kontrolü yapıldı

## 2. Kafe ayarı (Owner)

- [ ] `owner@…` ile giriş → **Kafe ayarı**
- [ ] İsim, ana renk (Wallet teması), opsiyonel logo URL
- [ ] Ödül kuralı: X damga → ödül metni
- [ ] **Kasiyerler**: en az 1 kasiyer hesabı
- [ ] Abonelik kartında durum ACTIVE görünüyor

## 3. Operasyon duman testi (Cashier)

- [ ] Tezgâh / mobil: yeni müşteri telefonu ile kayıt
- [ ] API konsolunda SMS mock `LINK (copy):` satırı göründü
- [ ] Link ile Wallet davet sayfası açılıyor (Apple / Google butonları)
- [ ] Damga ekle → sayaç artıyor; Wallet sync hatası yok (veya loglandı)
- [ ] Eşik dolunca **Ödül kullan** → sayaç sıfırlanıyor
- [ ] Günlük özet sayıları güncellendi

## 4. Pilot kafe notları

| Alan | Değer |
|------|--------|
| Kafe adı | |
| Slug | |
| Owner e-posta | |
| Kasiyer e-posta(lar) | |
| Ödül kuralı | |
| Canlıya alma tarihi | |
| SMS provider (mock / gerçek) | |
