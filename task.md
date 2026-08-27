# Dokun & Kazan — Görev Listesi

Türkiye’deki küçük kafeler için Wallet tabanlı **dijital damga kartı SaaS**. Müşteriye app indirtmeyiz; kart Apple/Google Wallet’ta yaşar. Bu liste CRM, VIP katmanları veya kampanya motoru inşa etmez — sadece kayıt, damga, ödül, Wallet ve basit operasyon panelleri.

**Sabit kararlar:** Türkiye first · MVP’de NFC yok (`StampSource` ile sonradan) · Flutter = personel · müşteri = Wallet only.

Görevler **sırayla** yapılır; bir üst görev bitmeden sonrakine geçilmez.

---

## Klasör yapısı

```text
newGenLoyalty/
├── apps/
│   ├── web/                 # Marketing site (Next.js, multipage, i18n TR/EN)
│   ├── admin/               # RBAC panel (SuperAdmin, Store Owner, Cashier)
│   ├── mobile/              # Flutter personel uygulaması
│   └── api/                 # NestJS + Prisma + PostgreSQL
├── packages/
│   ├── shared/              # Ortak tipler, API sözleşmeleri
│   └── config/              # Shared ESLint / tsconfig
├── project.md
└── task.md
```

---

## Teknoloji yığını

| Katman | Seçim |
|--------|--------|
| API | NestJS + Prisma + PostgreSQL |
| Auth | JWT + refresh; rol & izin (RBAC) |
| Marketing web | Next.js + next-intl (TR/EN) |
| Admin web | Next.js (App Router) |
| Mobile | Flutter (personel) |
| Wallet | Apple PassKit + Google Wallet API |
| SMS | Netgsm veya İletimerkezi |
| Ödeme | Sonra: iyzico (MVP’de abonelik manuel) |
| NFC | MVP yok; API’de `StampSource: cashier \| nfc` |

---

## Roller

### SUPER_ADMIN (platform)
- Tüm tenant’ları (kafeleri) listele / oluştur / dondur
- Abonelik durumunu yönet (trial / aktif / iptal)
- Platform ayarlarına bak (SMS vb.)
- Destek için tenant verisine eriş

### STORE_OWNER (kafe sahibi)
- Kafe profili: isim, logo, renk (Wallet teması)
- Ödül kuralı: X damga → 1 ödül (MVP’de tek kural)
- Kasiyer davet / kullanıcı yönetimi
- Basit rapor: müşteri sayısı, damga, kullanılan ödül

### CASHIER (kasiyer)
- Telefon ile müşteri bul / yeni kayıt
- Damga ekle
- Ödülü kullan
- Günlük özet (ayar ekranı yok)

**Müşteri** sistem kullanıcısı değildir; `Customer` kaydı + Wallet pass.

---

## Yüzey kapsamı

### Marketing website (`apps/web`)
- Landing, nasıl çalışır, özellikler, fiyat, iletişim, KVKK
- TR / EN

### Admin panel (`apps/admin`)
- SuperAdmin: tenant yönetimi
- Owner: ayar, ödül kuralı, kasiyerler, özet
- Cashier: kayıt, damga, ödül

### Mobil (`apps/mobile`)
- Login, müşteri ara / kayıt, damga, ödül, günlük özet
- Personel only — müşteri uygulaması yok

---

## Sıralı görevler

### 1. Repo iskeleti
- [x] Monorepo kökü (pnpm workspace veya eşdeğeri) ve `apps/` + `packages/` klasörleri
- [x] `apps/api`, `apps/web`, `apps/admin`, `apps/mobile` iskelet projeleri
- [x] `packages/shared` + `packages/config` iskeleti
- [x] Kök `.env.example` (DB, JWT, SMS, Wallet placeholder’ları)
- [x] Kısa README (nasıl ayağa kaldırılır)

### 2. DB şeması
- [x] Prisma init + PostgreSQL bağlantısı
- [x] Modeller: `Tenant`, `User`, `Role` / `Permission` (veya enum + permission tablosu)
- [x] Modeller: `Customer`, `StampLedger`, `RewardRule`, `Pass`
- [x] Tenant izolasyonu için FK’ler ve indeksler
- [x] İlk migration

### 3. API auth + RBAC
- [x] Kayıt / login / refresh token
- [x] JWT guard + rol guard
- [x] Permission kontrolü (SuperAdmin / Owner / Cashier)
- [x] Tenant context (isteğin hangi kafeye ait olduğu)
- [x] Seed: 1 SuperAdmin + 1 demo kafe (Owner + Cashier)

### 4. Damga motoru
- [x] `addStamp(customerId, source)` — `source`: `cashier` | `nfc`
- [x] `redeemReward(customerId)` — sayaç sıfırlama + ledger kaydı
- [x] MVP’de sadece `cashier` kaynağını kabul eden endpoint’ler
- [x] Ödül eşiği dolunca “ödül hazır” durumu
- [x] Idempotency / çift damga koruması (kısa süre)

### 5. Wallet entegrasyonu
- [x] Apple PassKit: `.pkpass` üretimi
- [x] Google Wallet: pass object + JWT link
- [x] Damga / ödül sonrası pass güncelleme (Google REST; Apple yeniden indirme — APNs push sonra)
- [x] Tenant logo / renk ile kart şablonu
- [x] Test cihazında kart ekleme doğrulaması

### 6. SMS
- [x] Netgsm veya İletimerkezi client
- [x] Müşteri kayıt sonrası Wallet ekleme linki SMS’i
- [x] TR telefon formatı doğrulama
- [x] Dev ortamında SMS mock / log modu
- [x] KVKK / ticari ileti notu (metin placeholder)
- [x] iletiMerkezi webhook (DLR) + admin SMS raporları

### 7. Admin panel MVP
- [x] Auth + role’e göre menü / route koruması
- [x] SuperAdmin: tenant listesi, oluştur, dondur, abonelik durumu
- [x] Owner: kafe profili, ödül kuralı, kasiyer davet, özet metrikler
- [x] Cashier: müşteri ara, kayıt, damga ekle, ödül kullan, günlük özet
- [x] API’ye bağlanmış uçtan uca mutlu yol (kayıt → damga → Wallet güncelleme)
- [x] Şifre unuttum / reset + personel reset linki
- [x] Müşteri CSV + damga defteri CSV
- [x] KVKK: müşteri silme + veri export
- [x] SuperAdmin lead listesi (iletişim / signup)

### 8. Marketing site
- [x] Multipage: landing, nasıl çalışır, özellikler, fiyat, iletişim
- [x] next-intl ile TR / EN
- [x] KVKK / gizlilik / kullanım şartları sayfaları
- [x] CTA → kayıt veya demo / iletişim formu
- [x] Admin girişine yönlendirme linki
- [x] İletişim formu → API lead kaydı
- [x] Self-serve trial signup (ödemesiz)

### 9. Flutter personel app
- [x] Proje iskeleti + API client + auth saklama
- [x] Login (aynı RBAC hesapları)
- [x] Müşteri ara (telefon / son haneler) + yeni kayıt
- [x] Damga ekle + ödül kullan
- [x] Günlük özet ekranı
- [x] Owner için opsiyonel mini özet (aynı app, role göre)

### 10. Abonelik iskeleti
- [x] Tek paket (TL) veri modeli / tenant abonelik alanı
- [x] MVP: manuel aktivasyon (SuperAdmin işaretler)
- [x] Owner ekranında abonelik durumu gösterimi
- [x] iyzico entegrasyonu için placeholder not / interface (implementasyon sonra)

### 11. Pilot hazırlık
- [x] Seed / demo veri scripti
- [x] 1–2 kafe onboarding checklist (doküman veya admin wizard adımları)
- [x] Smoke test listesi (kayıt, SMS, Wallet, damga, ödül)
- [x] Pilot kafe için env ve sertifika kontrol listesi

### 12. (Sonra) NFC adapter
- [ ] `addStamp(..., source: nfc)` endpoint / adapter
- [ ] Donanım veya NDEF tetikleyici akışı
- [ ] Admin/mobil’de NFC ayarı (MVP’de yok)
- [ ] Mevcut damga motoruna bağlama — iş kuralı değişmez

---

## Bilinçli yapılmayacaklar

- Kapsamlı CRM / segmentasyon
- E-posta pazarlama otomasyonu
- VIP üyelik katmanları
- Müşteri mobil uygulaması (Wallet yeter)
- MVP’de NFC donanım / okuyucu akışı
- POS entegrasyonu (Square, Adisyo vb.)
- Çoklu şube / zincir yönetimi (MVP sonrası)
- Sosyal medya entegrasyonu
