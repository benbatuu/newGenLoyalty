# Dokun & Kazan — Görev Listesi

> **Durum (2026-08-31):** Ödeme (iyzico §13.1, Membership B2C checkout) ve prod sertifika checklist (§13.2) hariç tüm maddeler MVP/iskelet olarak tamamlandı. Canlıda `=true` + plan kotası gerekir.  
> **Gerçek kapanış checklist (audit 2026-09-02):** [`task_completion.md`](task_completion.md) — stub maddeler, admin/mobile gap’ler ve test borcu. Ödeme maddeleri hariç.

Wallet-first **sadakat + pazarlama platformu**. V1 (MVP) tamamlandıktan sonra uygulanır.

**Kapsam ilkesi:** 'de hiçbir özellik kapsam dışı değildir. [`task.md`](task.md) içindeki "bilinçli yapılmayacaklar" maddelerinin tamamı bu listeye taşınmıştır. Fark yalnızca **faz sırası** ve **paket katmanı**ndadır.

**Önkoşul:** V1 MVP görevleri ([`task.md`](task.md) §1–11) tamamlanmış olmalı.

**Sabit kararlar ():** Türkiye first · Wallet birincil müşteri kanalı · Flutter = personel · müşteri app opsiyonel (Faz 7) · fazlar sırayla; bir üst faz bitmeden sonrakine geçilmez (pilot kapısı istisnası: erken hotfix).

**Ödeme:** iyzico self-serve **en son faz** — canlıda SuperAdmin manuel `ACTIVE` devam eder.

**Lokal :** [`docs/platform/local-dev.md`](docs/platform/local-dev.md) — `` ile `/programs/*`; canlıda bayraklar kapalı.

**Referans:** Detaylı mimari ve risk analizi → `.cursor/plans/dokun_kazan_plan.md`  
**Rakip referans (ürün anlayışı):** [BrandWallet](https://brand-wallet.com/) — program sayfaları §Program tipi spesifikasyonları tablosunda.

---

## Klasör yapısı (ekleri)

```text
newGenLoyalty/
├── apps/
│   ├── api/                 # + billing, campaigns, crm, pos-adapters, jobs
│   ├── admin/               # + CRM, segments, email, branches, VIP
│   ├── mobile/              # + multi-program counter, NFC, billing
│   ├── web/                 # + pricing tiers, program types, embed widget
│   └── customer/            # (Faz 7) PWA veya apps/customer-pwa
├── packages/
│   └── shared/              # ProgramType, SegmentRule, plan enums
├── docs/
│   └── /                  # Faz dokümantasyonu, POS adapter rehberleri
├── task.md                  # V1 (tamamlandı)
└── task.md               # Bu dosya
```

---

## Teknoloji yığını (ekleri)

| Katman | V1 | ek / değişim |
|--------|-----|-----------------|
| Ödeme (B2B) | Manuel | **iyzico** Checkout + webhook |
| Ödeme (B2C üyelik) | — | iyzico abonelik (MembershipCard) |
| E-posta | — | Resend / SendGrid / SES (env seçilebilir) |
| SMS segment | Davet only | Segment kampanya + **İYS** |
| Job queue | `@nestjs/schedule` cron | **BullMQ + Redis** (kampanya, segment, metrik) |
| POS | — | Adapter pattern (Adisyo, iyzico POS, Square, Toast) |
| NFC | `StampSource.nfc` kapalı | NDEF + kasiyer onaylı akış → Apple VAS |
| Müşteri yüzey | Wallet only | Opsiyonel **PWA / native app** (Faz 7) |
| API | `/v1` implicit | `/programs/*` modüler namespace + feature flags |

---

## Paketleme (feature matrisi)

| Paket | Fiyat (rehber) | Kart limiti | İzinli kart tipleri |
|-------|----------------|-------------|---------------------|
| **Starter** / `cafe` | ~₺990/ay | **1 kart** | StampCard |
| **Growth** | ~₺1.490/ay | **3 kart** | StampCard (1), MultiStamp (2), PointCard (1) |
| **Pro** | ~₺1.990/ay | **5 kart** | + DiscountCard, EventCard |
| **Business** | ~₺2.990/ay | **8 kart** | + MembershipCard, StaffCard |
| **Enterprise** | Özel | **50 kart** | Tüm tipler |

**Kurallar:** Kart tipi oluşturulduktan sonra **değiştirilemez** — yeni tip için yeni kart açılır. Paket kotası `packages/shared/src/plans.ts` + `GET /programs` ile uygulanır.

| Paket | Fiyat (rehber) | Dahil özellikler |
|-------|----------------|------------------|
| **Starter** | ~₺990/ay | StampCard, Wallet, temel rapor, 1 şube |
| **Growth** | ~₺1.490/ay | + MultiStamp, PointCard, kampanya, win-back, doğum günü |
| **Pro** | ~₺1.990/ay + şube | + Event, Discount, NFC, çoklu şube, temel segment |
| **Business** | ~₺2.990/ay | + CRM, e-posta otomasyonu, SMS segment, VIP, referans |
| **Enterprise** | Özel | + POS, Staff/Membership, VAS, sosyal, müşteri app, SLA, API |

---

## Program tipleri — özet tablo

| Tip | Faz | Rakip referans |
|-----|-----|----------------|
| StampCard | V1 ✓ | [BrandWallet Stamp Card](https://brand-wallet.com/products/loyalty-management/stamp-card) |
| MultiStamp | Faz 1 | [Multi Stamp Card](https://brand-wallet.com/products/loyalty-management/multi-stamp-card) |
| PointCard | Faz 2 | [Point Card](https://brand-wallet.com/products/loyalty-management/point-card) |
| DiscountCard | Faz 2 | [Discount Card](https://brand-wallet.com/products/loyalty-management/discount-card) |
| EventCard | Faz 2 | [Event Card](https://brand-wallet.com/products/customer-journey-management/event-card) |
| MembershipCard | Faz 4 | [Membership Card](https://brand-wallet.com/products/customer-journey-management/membership-card) |
| StaffCard | Faz 4 | [Staff Card](https://brand-wallet.com/products/customer-journey-management/staff-card) |

Detaylı spesifikasyonlar aşağıdadır. Rakip özellikleri **referans** alınır; birebir kopyalanmaz. Dokun & Kazan hedefi: **daha esnek yapılandırma**, **Türkiye uyumu**, **NFC yol haritası**, **şube/POS hazırlığı**, **açık veri/export**.

---

## Ortak kavramlar (tüm program tipleri)

Development sırasında her program tipi şu ortak katmanları kullanır:

### LoyaltyProgram (tenant başına 1+ program)

```text
LoyaltyProgram
├── type: StampCard | MultiStamp | PointCard | ...
├── config: JSON (tip-spesifik kurallar — aşağıdaki bölümlerde şema)
├── tiers: ProgramTier[] (eşik / ödül — tip bazlı zorunlu veya opsiyonel)
├── enrollPolicy: davet SMS, toplanan alanlar (mevcut invite akışı genişler)
├── walletTemplate: pass alanları, tema, changeMessage şablonları (V1 admin genişler)
└── isActive, validFrom?, validUntil? (EventCard zorunlu)
```

### CustomerProgram (müşteri × program)

```text
CustomerProgram
├── balance: Int (damga sayısı veya puan — anlamı type'a göre)
├── balances?: JSON (MultiStamp lane bazlı sayaçlar)
├── eligibleRewards?: tier id listesi
├── metadata: VIP tier, membership expiry, staff limit counters...
└── Pass (Apple/Google) — mevcut Pass modeli programId ile ilişkilendirilir
```

### LedgerEntry (her işlem)

```text
LedgerEntry
├── type: STAMP | REDEEM | ADJUST | POINT_EARN | POINT_REDEEM | DISCOUNT_USE | EVENT_CHECKIN | MEMBERSHIP_USE | STAFF_REDEEM | REFERRAL
├── amount: Int (damga adedi, puan, indirim kuruşu vb.)
├── source: cashier | nfc | pos | campaign | system
├── metadata: { tierId, laneId, campaignId, branchId, posReceiptId, multiplier, ... }
└── createdByUserId?, branchId?
```

### Add-On Promotions (kampanya katmanı — Faz 1+)

Rakipteki “Add-On Promotions” tek bir `Campaign` modelinde birleşir; program tipinden bağımsız tetiklenir:

| Kampanya tipi | Örnek | Tetikleyici |
|---------------|-------|-------------|
| `MULTIPLIER` | 2x damga cumartesi | tarih / gün / şube |
| `FIRST_STAMP_FREE` | İlk damga hediye | kayıt sonrası ilk işlem |
| `BONUS_STAMP` | +1 damga tatlı alana | kasiyer ürün grubu seçimi |
| `WIN_BACK` | 30 gündür gelmedi → SMS/push | segment cron |
| `BIRTHDAY` | Doğum günü mesajı | V1 mevcut — Campaign'e migrate |
| `LOCATION` | Mağaza yakınında push | geofence (Wallet Locations API) |

**Bizde fark:** kampanya + segment (Faz 5) birleşince aynı motor hem tenant-wide hem segment bazlı çalışır; rakipte anlatıldığı gibi “sadece tatil indirimi” ile sınırlı değil.

### Bildirim kanalları (öncelik sırası)

1. **Wallet push** (lock screen — birincil, V1)
2. **Owner FCM** (operasyon özeti — V1)
3. **SMS** (davet + segment — İYS uyumlu Faz 5)
4. **E-posta** (Faz 5)
5. **PWA push** (Faz 7, opsiyonel)

### Kasiyer UX ilkesi

- POS **zorunlu değil** (rakiple aynı); POS varsa otomatik, yoksa manuel
- Her işlem **≤3 dokunuş** hedefi (müşteri seç → aksiyon → onay)
- Program tipi değişince counter UI **aynı shell**, içerik strategy ile değişir
- Geri alma: owner yetkisiyle `ADJUST` ledger (audit zorunlu)

---

## Program tipi spesifikasyonları

### 1. StampCard (V1 — mevcut, 'de sertleştir)

**Referans:** [BrandWallet Stamp Card](https://brand-wallet.com/products/loyalty-management/stamp-card)

**Ne işe yarar:** Klasik dijital damga kartı. Her qualifying ziyaret/alışveriş = 1 damga; eşik dolunca ödül.

**Rakipte olan · bizde V1/:**

| Özellik | BrandWallet | Dokun & Kazan |
|---------|-------------|---------------|
| Dijital damga, kağıt yok | ✓ | ✓ V1 |
| Add-on promosyonlar | ✓ | Faz 1 Campaign |
| Otomatik push (doğum günü, lokasyon) | ✓ | Doğum günü V1; lokasyon Faz 1 |
| Table tent / fiziksel materyal | ✓ | Faz 2 — PDF/PNG şablon indir (owner) |
| İşlem analitiği | ✓ | Faz 0 rapor → Faz 6 derin |
| POS şart değil | ✓ | ✓ |

**'de iyileştirmeler (V1 davranışını bozmadan):**

- `LoyaltyProgram.config` şeması:

```typescript
// packages/shared — StampCardConfig
{
  earnRule: 'PER_VISIT' | 'PER_RECEIPT';      // ziyaret başına (default) veya fiş başına
  stampsPerEarn: 1;                            // varsayılan 1
  maxStampsPerDay: 1;                          // V1: STAMP_MAX_PER_CUSTOMER_PER_DAY
  blockStampWhenRewardReady: true;             // ödül hazırken damga durdur
  resetOnRedeem: 'ZERO' | 'ROLLOVER_EXCESS';   // redeem sonrası sıfır veya fazla damga devret
  tiers: [{ threshold: 10, rewardLabel: '1 bedava filtre', redeemCost: 10 }]
}
```

- **Wallet pass:** damga şeridi (V1 `stampTheme`), birincil alan = `balance/threshold`, durum alanı = kalan/ödül hazır metni (owner özelleştirir)
- **Kasiyer:** müşteri bul → Damga Ekle → (opsiyonel) kampanya badge “2x aktif”
- **Redeem:** tek tier V1'de; MultiStamp'e geçince aynı program migrate edilebilir
- **Edge cases:** çift tıklama (V1 idempotency); günlük limit aşımı → 409; ödül hazır + damga → 400

**Kabul kriterleri:** V1 smoke test geçer; config JSON migrate sonrası aynı davranış; Wallet sync &lt;5 sn.

---

### 2. MultiStamp (Faz 1)

**Referans:** [BrandWallet Multi Stamp Card](https://brand-wallet.com/products/loyalty-management/multi-stamp-card)

**Ne işe yarar:** Tek Wallet kartında **birden fazla ilerleme izi** veya **çarpanlı damga**. Örn. kahve hattı 10 damga, tatlı hattı 5 damga; veya “tatlı alana 2x damga”.

**Rakipteki model:** Ürün grupları (Coffee, Cold Drinks, Desserts) + Double/Triple/Quadruple stamp — **tek kart**.

**Bizde geliştirilmiş model — iki mod (owner seçer):**

#### Mod A: `LANES` (paralel izler)

```typescript
// MultiStampConfig mode: 'LANES'
{
  mode: 'LANES',
  lanes: [
    { id: 'coffee', label: 'Kahve', icon: 'COFFEE', tiers: [{ threshold: 10, rewardLabel: 'Bedava kahve', redeemCost: 10 }] },
    { id: 'dessert', label: 'Tatlı', icon: 'DESSERT', tiers: [{ threshold: 5, rewardLabel: 'Bedava tatlı', redeemCost: 5 }] }
  ],
  maxStampsPerDayPerLane: 1
}
```

- `CustomerProgram.balances`: `{ coffee: 3, dessert: 2 }`
- Wallet pass: her lane için strip segment veya secondary field (max 3 lane — UX sınırı; fazlası PWA'da)
- Kasiyer redeem: lane seç → uygun tier listele → redeem

#### Mod B: `MULTIPLIER` (tek sayaç, çarpanlı damga)

```typescript
// MultiStampConfig mode: 'MULTIPLIER'
{
  mode: 'MULTIPLIER',
  productGroups: [
    { id: 'coffee', label: 'Kahve', multiplier: 1 },
    { id: 'dessert', label: 'Tatlı', multiplier: 2 },
    { id: 'promo', label: 'Kampanya günü', multiplier: 3 }
  ],
  tiers: [{ threshold: 10, rewardLabel: 'Bedava içecek', redeemCost: 10 }]
}
```

- Kasiyer damga öncesi **ürün grubu seçer** → `amount = multiplier` kadar balance artar (günlük cap uygulanır)
- Campaign `MULTIPLIER` ile çakışma: **yüksek çarpan kazanır**, ledger metadata'da ikisi de loglanır

**BrandWallet'tan farkları (bilinçli üstünlük):**

- Mod A/B owner tarafından seçilir — ikisi aynı tenant'ta **aynı anda değil**
- Lane başına **farklı tier seti** (5'te tatlı, 10'da kahve)
- Kısmi redeem: tier `redeemCost` kadar düşer, sıfırlama zorunlu değil
- Şube bazlı lane aktif/pasif (Faz 3)
- NFC/QR damgada son seçilen ürün grubu hatırlama (kasiyer onayı)

**Kasiyer akışı:**

1. Müşteri seç
2. (Mod B) Ürün grubu chip'leri — varsayılan son kullanılan
3. Damga ekle — çarpan göster: "+2 damga (Tatlı)"
4. Redeem: uygun tier'lar listelenir; birden fazlaysa seçim

**Wallet pass alanları:**

- Header: toplam ilerleme veya birincil lane
- Primary: `3/10 Kahve`
- Secondary: `2/5 Tatlı` (Mod A)
- ChangeMessage: lane/threshold bazlı owner şablonu

**Edge cases:**

- Mod B'de multiplier ile günlük cap: **işlem sayısı** mı **damga puanı** mı cap'lenir → config `dailyCapUnit: 'TRANSACTIONS' | 'STAMPS'` (default STAMPS)
- Bir lane'de ödül hazır, diğerinde damga devam (Mod A)
- Tier redeem sonrası yetersiz balance → 400

**Kabul kriterleri:** Mod A ve B integration test; Wallet 2 lane görüntüleme; kampanya 2x + multiplier doğru hesap.

---

### 3. PointCard (Faz 2)

**Referans:** [BrandWallet Point Card](https://brand-wallet.com/products/loyalty-management/point-card)

**Ne işe yarar:** Harcama tutarına göre puan; puanla ödül veya indirim. Sepet büyütmeye odaklı.

**Rakipte olan:** Tiered point (harcamaya göre artan kazanım oranı), segmentasyon, şube raporu.

**Bizde config:**

```typescript
// PointCardConfig
{
  earnRate: { default: 1, currency: 'TRY' },     // 1 TL = 1 puan
  categoryRates: [{ categoryId: 'drink', multiplier: 2 }],  // opsiyonel
  tieredEarnRates: [                             // VIP/Faz 6 ile birleşir
    { minLifetimeSpend: 0, rateMultiplier: 1 },
    { minLifetimeSpend: 50000, rateMultiplier: 1.5 }           // kuruş cinsinden
  ],
  redeemRules: [
    { pointCost: 100, rewardType: 'FREE_ITEM', rewardLabel: 'Bedava içecek' },
    { pointCost: 50, rewardType: 'DISCOUNT_FIXED', value: 2500 }  // 25 TL, kuruş
  ],
  maxPointsPerDay: 10000,
  requireAmountConfirmationAbove: 50000,       // 500 TL üstü kasiyer onay dialog
  allowPartialRedeem: true
}
```

**Kazanım kaynakları:**

| Kaynak | `source` | Not |
|--------|----------|-----|
| Kasiyer manuel tutar | `cashier` | POS yokken |
| POS webhook | `pos` | Faz 4 — fiş tutarı otomatik |
| Kampanya çarpanı | `campaign` | metadata |

**Kasiyer akışı:**

1. Müşteri seç
2. Tutar gir (TL) + opsiyonel kategori chip
3. Onay: “47,50 TL → 47 puan (+ kampanya 2x = 94)”
4. Redeem: puan yeterli ödüller listelenir; seç → düş

**Wallet pass:**

- Primary: `1.240 puan`
- Secondary: sonraki ödüle kalan veya “100 puan = bedava çay”
- Strip: puan kullanılmaz; progress bar opsiyonel (threshold'a göre)

**BrandWallet'tan farklar:**

- Kategori çarpanı POS'tan veya kasiyer seçiminden
- Tiered earn VIP modülüyle paylaşımlı (duplicate config yok)
- Günlük max + yüksek tutar onayı (fraud)
- Ledger'da her puan hareketi kuruş precision (`amount` integer)

**Edge cases:** 0 TL; negatif adjust sadece owner; redeem sonrası yetersiz puan; POS duplicate webhook idempotency (`posReceiptId` unique)

**Kabul kriterleri:** Manuel + mock POS ile earn/redeem; tiered rate doğru; Wallet sync.

---

### 4. DiscountCard (Faz 2)

**Referans:** [BrandWallet Discount Card](https://brand-wallet.com/products/loyalty-management/discount-card)

**Ne işe yarar:** İlerleme şartı olmadan **indirim hakkı** sunan kart. Dağıtım kolay; marka bilinirliği ve tekrar ziyaret.

**Rakipte olan:** Tiered discount (sadakat arttıkça indirim yükselir), süre sınırı, push.

**Bizde config:**

```typescript
// DiscountCardConfig
{
  discountType: 'PERCENT' | 'FIXED',
  value: 10,                                     // %10 veya kuruş
  tieredDiscounts: [                             // opsiyonel — spend/VIP ile
    { minVisits: 0, value: 10, discountType: 'PERCENT' },
    { minVisits: 20, value: 15, discountType: 'PERCENT' }
  ],
  validFrom?, validUntil?,
  maxUsesTotal?, maxUsesPerDay?: 1,
  maxUsesPerMonth?,
  applicableCategories?: string[],               // boş = tüm ürünler
  stackWithCampaigns: false                      // kampanya ile birleşmez default
}
```

**Kullanım akışı (kasiyer doğrulama):**

1. Müşteri QR/pass okut (`stampByPassCode` genişler → `verifyDiscount`)
2. Sistem: geçerli mi, limit doldu mu, tier indirimi ne
3. Kasiyer: “%15 indirim uygulandı” → `DISCOUNT_USE` ledger
4. Wallet: kalan kullanım / son kullanım tarihi güncellenir

**Wallet pass:**

- Ön yüz: “%10 indirim” büyük tipografi
- Alt alan: “Bugün: 1/1 kullanım hakkı” veya “Son: 12.03.2027”
- Barkod/QR: doğrulama için (V1 barcode format tenant ayarı)

**BrandWallet'tan farklar:**

- Tiered discount **ziyaret sayısı**, harcama veya VIP tier ile tetiklenebilir (config `tierTrigger: 'VISITS' | 'SPEND' | 'VIP'`)
- Kategori kısıtı (sadece içecekler)
- Kampanya ile stack kuralı owner seçer
- İndirim **otomatik POS'a uygulanmaz** Faz 4 öncesi — kasiyer manuel; POS adapter sonra `applyDiscount` hook

**Edge cases:** Süresi dolmuş kart; limit aşımı; aynı gün çift scan → idempotency window

**Kabul kriterleri:** QR verify &lt;2 sn; limitler doğru; tier yükselince Wallet güncellenir.

---

### 5. EventCard (Faz 2)

**Referans:** [BrandWallet Event Card](https://brand-wallet.com/products/customer-journey-management/event-card) *(rakipte "Soon")*

**Ne işe yarar:** Konser, tadım günü, pop-up, workshop için **dijital bilet / davetiye**. Katılımcı bilgisi, giriş hakkı, etkinlik push'ları.

**Bizde erken ve daha kapsamlı teslim** — rakip henüz tam açmamış.

**Config:**

```typescript
// EventCardConfig
{
  eventName: string,
  validFrom: ISO8601,
  validUntil: ISO8601,
  venue?: { name, address, lat, lng },           // Wallet Locations + yol tarifi push
  entryLimit: number,                            // 1 = tek giriş, N = çoklu
  collectFields: ['name', 'email'],              // invite form genişler
  checkInMode: 'CASHIER_SCAN' | 'SELF_QR',      // kasiyer okut veya müşteri QR göster
  autoDeactivateAfterEvent: true,
  reminderPush: [{ hoursBefore: 24, messageTemplate: '...' }]
}
```

**Akışlar:**

- **Dağıtım:** SMS/link ile kayıt → Wallet'a event pass ekle (ayrı `LoyaltyProgram` instance, `type=EventCard`)
- **Check-in:** kasiyer scan → `EVENT_CHECKIN` ledger; `entryLimit` decrement
- **İletişim:** etkinlik öncesi/sonrası scheduled push (Campaign `SCHEDULED`)

**Wallet pass tasarımı:**

- Event branding (banner görsel URL — R2)
- Tarih/saat prominent
- QR: check-in kodu (tek kullanımlık veya rotating — config)

**BrandWallet'tan farklar:**

- Self check-in modu
- Çoklu giriş hakkı (3 gün festival)
- Etkinlik bitince otomatik pass expire + arşiv
- Aynı tenant'ta **Event + StampCard paralel** — müşteride iki pass olabilir

**Edge cases:** Geç kalma — validUntil sonrası check-in red; no-show raporu; capacity limit (opsiyonel `maxAttendees`)

**Kabul kriterleri:** Kayıt → pass → check-in → limit 0'da red; reminder push zamanında.

---

### 6. MembershipCard (Faz 4)

**Referans:** [BrandWallet Membership Card](https://brand-wallet.com/products/customer-journey-management/membership-card)

**Ne işe yarar:** **Ücretli abonelik** — spor salonu, coworking, premium kafe kulübü. Ödeme + dijital üyelik kartı + periyodik haklar.

**Config:**

```typescript
// MembershipCardConfig
{
  plans: [
    {
      id: 'monthly',
      label: 'Aylık üyelik',
      priceTry: 29900,                           // kuruş
      billingInterval: 'MONTH',
      benefits: [
        { type: 'MONTHLY_FREE_ITEM', label: 'Ayda 2 bedava filtre', quota: 2 },
        { type: 'DISCOUNT_PERCENT', value: 10 },
        { type: 'POINT_MULTIPLIER', value: 2 }   // PointCard ile birleşebilir
      ]
    }
  ],
  gracePeriodDays: 3,
  iyzicoSubscriptionProductCode?: string
}
```

**Akış:**

1. Müşteri invite/checkout sayfasında plan seç → **iyzico B2C abonelik**
2. Ödeme OK → Membership pass Wallet'a eklenir
3. Her ay `benefitQuota` reset (cron)
4. Kasiyer: “Üyelik hakkı kullan” → quota düş veya indirim uygula
5. Ödeme başarısız → `gracePeriod` → askı → pass “Süresi doldu” statüsü

**Wallet pass:**

- Üyelik tipi + yenileme tarihi
- Kalan hak: “2/2 bedava içecek”
- VIP badge entegrasyonu (Faz 6)

**BrandWallet'tan farklar:**

- iyzico native abonelik (TR ödeme)
- Benefit tipi genişletilebilir enum
- Gym-style **giriş logu** (check-in = MembershipCard + EventCard check-in paylaşımlı motor)
- KVKK + mesafeli satış + cayma metinleri zorunlu gate

**Edge cases:** Upgrade/downgrade plan; pro-rata (Faz 4 basit: dönem sonunda değişir); iptal sonrası pass revoke

**Kabul kriterleri:** iyzico test abonelik döngüsü; quota reset; grace suspend.

---

### 7. StaffCard (Faz 4)

**Referans:** [BrandWallet Staff Card](https://brand-wallet.com/products/customer-journey-management/staff-card) *(rakipte "Soon")*

**Ne işe yarar:** **Personel yan hakları** — çalışan sadakati, iç indirim, performans ödülü. Müşteri programından **izole** ( fraud riski yüksek).

**Config:**

```typescript
// StaffCardConfig
{
  enrollment: 'WHITELIST' | 'INVITE_CODE',
  inviteCodes?: string[],
  whitelistedPhones?: string[],
  benefitType: 'STAMP' | 'POINT' | 'DISCOUNT' | 'FIXED_ALLOWANCE',
  allowance: {
    monthlyBudgetTry?: 50000,                   // aylık TL limiti
    dailyRedeemLimit?: 1,
    percentDiscount?: 20
  },
  requireManagerPinAbove?: 10000,                // tek seferde 100 TL üstü PIN
  linkedBranchIds?: string[]                     // sadece kendi şubesinde
}
```

**Güvenlik (rakipte zayıf — bizde zorunlu):**

- Staff `Customer` kaydı `isStaff: true` flag — normal kampanyalara girmez
- Her redeem `STAFF_REDEEM` + `createdByUserId` + opsiyonel `managerPinUserId`
- Owner dashboard: anormal kullanım alarmı (gece 02:00 redeem vb.)
- Staff pass **farklı renk/template** — kasiyerde turuncu banner

**Kasiyer akışı:**

1. Staff pass scan veya staff listesinden seç
2. Hak tipine göre indirim uygula / allowance düş
3. Limit aşımı → manager PIN

**BrandWallet'tan farklar:**

- Erken teslim (rakip Soon)
- Allowance bütçe modeli (aylık TL tavanı)
- Manager onay eşiği
- Audit export (Enterprise)

**Edge cases:** İşten ayrılan personel → whitelist'ten çıkar → pass invalidate

**Kabul kriterleri:** Non-staff redeem edemez; limitler çalışır; audit log tam.

---

## Çapraz özellikler (program tipinden bağımsız)

| Özellik | Açıklama | Faz |
|---------|----------|-----|
| **Pass & Enroll Designer** | Davet sayfası + pass ön/arka yüz: renk, logo, alan etiketleri, changeMessage (V1 admin genişler) | Faz 0–Faz 1 |
| **Table Tent / QR Print** | Tezgah materyali PDF (QR → invite URL); TR/EN | Faz 2 |
| **Location push** | `passLocations` + geofence reminder (Apple/Google Locations) | Faz 1 |
| **Automated Scenarios** | IF segment + WHEN trigger → THEN push/SMS/email | Faz 5 |
| **Subscription Tracking** | B2B tenant abonelik (iyzico) + B2C MembershipCard ayrı modeller | Faz 0 / Faz 4 |
| **Advanced Reporting** | Program/lane/branch/kategori kırılımı | Faz 0 → Faz 6 |
| **QR Menu** | Dijital menü builder (rakip MultiStamp sayfasında) | Faz 3 opsiyonel epic — ayrı `Menu` modülü, sadakatten bağımsız ama aynı admin |

---

## Sıralı görevler

### 13. Faz 0 — Pilot → Canlı operasyon (4–6 hafta)

**Pilot kapısı:** 2+ kafe, 30 gün, churn < %20 → Faz 1'e geç.

#### 13.1 iyzico self-serve ödeme — **ERTELENDİ (en son faz)**
- [ ] `IyzicoPaymentProvider` gerçek implementasyon ([`payment-provider.ts`](apps/api/src/billing/payment-provider.ts))
- [ ] Prisma: `Subscription`, `Payment`, `Invoice` modelleri
- [ ] Checkout session endpoint + success/failure redirect
- [ ] Webhook: ödeme onayı → `subscriptionStatus: ACTIVE`
- [ ] Trial → paid otomasyonu; yenileme / iptal akışı
- [ ] Admin [`billing/page.tsx`](apps/admin/src/app/billing/page.tsx): checkout CTA + fatura geçmişi
- [ ] Flutter [`billing_screen.dart`](apps/mobile/lib/screens/billing_screen.dart): checkout deep link
- [ ] SuperAdmin: manuel override korunur (destek senaryosu)

#### 13.2 Production sertleştirme
- [ ] Apple APNs prod sertifikaları ([`apple-apns.service.ts`](apps/api/src/wallet/apple-apns.service.ts))
- [ ] Google Wallet service account prod
- [ ] SMS prod provider (Netgsm / İletimerkezi) — mock kapatma checklist
- [ ] R2 / asset storage prod (logo, ikon)
- [ ] [`docs/pilot/env-certs-checklist.md`](docs/pilot/env-certs-checklist.md) prod maddeleri doğrulandı

#### 13.3 Rapor v1.5
- [x] Haftalık / aylık damga & redeem trend grafikleri
- [x] Kohort başlangıcı (kayıt haftası → 4 hafta aktivite)
- [x] "X damga kala" müşteri listesi (admin + export)

#### 13.4 Owner onboarding wizard
- [x] [`docs/pilot/onboarding-checklist.md`](docs/pilot/onboarding-checklist.md) → admin adım adım wizard
- [x] İlerleme göstergesi; eksik adım uyarıları (ödül kuralı, kasiyer, smoke test)

#### 13.5 Pilot feedback
- [x] Owner in-app geri bildirim formu → API lead / ticket kaydı
- [x] SuperAdmin feedback listesi

#### 13.6 Altyapı hazırlığı
- [x] API `/` namespace iskeleti (`/loyalty/health`, `/programs/me`)
- [x] Feature flag servisi (``, ``)
- [x] Redis + BullMQ iskeleti (Faz 1 kampanyalar için)

---

### 14. mimari — LoyaltyProgram soyutlaması (Faz 0–Faz 1, 13 ile paralel veya hemen sonra)

- [x] Prisma: `LoyaltyProgram`, `ProgramTier`, `CustomerProgram`
- [x] `StampLedger` genişletme (`programId`, `amount`, `metadata` — nullable)
- [x] Migration + backfill: `RewardRule` → `LoyaltyProgram` + `ProgramTier`
- [x] Dual-write: `Customer.stampCount` → `CustomerProgram.balance` (stamp/redeem/register sync)
- [x] `packages/shared`: `ProgramType`, `StampCardConfig`, plan kodları
- [x] `/programs/me` endpoint (V1 `/stamps` değişmedi)
- [x] `LoyaltyEngineService` iskelet (tenant create, reward rule, customer sync)
- [x] Damga motoru strategy refactor (`LoyaltyEngineService` içinde StampCard logic taşınması — Faz 1)

---

### 15. Faz 1 — MultiStamp + kampanya motoru (6–8 hafta)

#### 15.1 MultiStamp (→ §2 MultiStamp spesifikasyonu)

- [x] `MultiStampConfig`: `mode: LANES | MULTIPLIER` + JSON schema validation (tip tanımları; class-validator Faz 1)
- [x] Mod A `LANES`: `ProgramStampLane`, `CustomerProgram.balances` JSON
- [x] Mod B `MULTIPLIER`: kasiyer `productGroupId`, `dailyCapUnit` config (backend + Flutter chip UI)
- [x] `ProgramTier`: laneId opsiyonel; `threshold`, `rewardLabel`, `redeemCost`
- [x] `addStamp`: lane/multiplier metadata; tier bazlı `eligibleTierIds`
- [x] `redeemReward(tierId)`: kısmi düşüm (MULTIPLIER + LANES + tierId; V1 tam sıfırlama korundu)
- [x] `PATCH /programs/me` — program + tier güncelleme
- [x] Wallet pass: Mod A çoklu alan; Mod B çarpan changeMessage
- [x] Admin [`reward/page.tsx`](apps/admin/src/app/reward/page.tsx): mod seçici, lane editörü, tier editörü, canlı önizleme
- [x] Flutter counter: ürün grubu / lane seçimi; tier redeem dialog
- [x] Integration test: Mod A, Mod B, kampanya 2x + multiplier çakışması (`loyalty-programs.spec.ts` + manuel smoke)

#### 15.2 Kampanya motoru
- [x] Prisma: `Campaign`, `CampaignRun`
- [x] 2x damga günü: `multiplier` + kasiyer UI badge
- [x] Win-back cron: son damga > N gün → owner push / opsiyonel SMS
- [x] Zamanlı Wallet broadcast (mevcut anlık duyuru + schedule)
- [x] BullMQ job: kampanya çalıştırma, segment olmadan tenant-wide
- [x] Admin: kampanya oluştur / listele / durdur

---

### 16. Faz 2 — PointCard, DiscountCard, EventCard (8–10 hafta)

#### 16.1 PointCard (→ §3 PointCard spesifikasyonu)

- [x] `PointCardConfig`: earnRate, categoryRates, tieredEarnRates, redeemRules
- [x] Kasiyer tutar + kategori girişi; onay dialog (`requireAmountConfirmationAbove`)
- [x] `POINT_EARN` / `POINT_REDEEM` ledger tipleri; kuruş precision
- [x] `maxPointsPerDay`; POS `posReceiptId` idempotency (Faz 4 hazırlık)
- [x] Wallet: puan alanı, sonraki ödül metni
- [x] VIP tiered rate hook (Faz 6 ile entegrasyon noktası — `VipService.maybeUpgradeTier` + PointCard tieredEarnRates)

#### 16.2 DiscountCard (→ §4 DiscountCard spesifikasyonu)

- [x] `DiscountCardConfig`: PERCENT/FIXED, tieredDiscounts, limitler, kategori kısıtı
- [x] `verifyDiscount` endpoint ([`stampByPassCode`](apps/api/src/stamps/stamps.controller.ts) genişletme + `POST /stamps/scan-discount`)
- [x] `DISCOUNT_USE` ledger; günlük/aylık/toplam limit sayaçları
- [x] Wallet: indirim değeri + kalan hak gösterimi
- [x] `tierTrigger`: VISITS | SPEND | VIP

#### 16.3 EventCard (→ §5 EventCard spesifikasyonu)

- [x] `EventCardConfig`: validFrom/Until, entryLimit, venue, checkInMode
- [x] Ayrı program instance; paralel StampCard ile birlikte çalışma
- [x] `EVENT_CHECKIN` ledger; `reminderPush` Campaign entegrasyonu
- [x] Event branding Wallet şablonu (banner R2)
- [x] Self-QR vs kasiyer scan modları
- [x] `autoDeactivateAfterEvent`; no-show raporu

#### 16.4 Ortak (program tipleri)
- [x] Program tipi seçici (owner onboarding + ayar — reward kart galerisi)
- [x] Flutter: program-aware counter formları (`CounterScreen` + puan)
- [x] [`wallet.service.ts`](apps/api/src/wallet/wallet.service.ts): tip bazlı pass field mapping
- [x] Integration test: her program tipi için uçtan uca (§1–§5 kabul kriterleri — unit + smoke)

#### 16.5 Table tent & fiziksel materyal
- [x] Admin: QR + kafe adı + CTA ile PDF/PNG export (A6 table tent)
- [x] TR/EN metin; tenant renkleri

---

### 17. Faz 3 — NFC + çoklu şube (8–12 hafta)

#### 17.1 NFC adapter
- [x] `StampSource.nfc` kilidi kaldır ([`stamps.service.ts`](apps/api/src/stamps/stamps.service.ts)) — `=true`
- [x] Çözüm B: NFC tetik → kasiyer ekranında son müşteri önerisi → onay → damga
- [x] Çözüm A: NDEF tag → mini web → cihaz eşleşmesi → arka planda damga (tap URL)
- [x] Prisma: `NfcDevice`, `NfcTapEvent`
- [x] Admin / mobil: NFC URL ve tag yapılandırması
- [x] Donanım uyumluluk listesi dokümantasyonu (`docs/platform/nfc-hardware.md`)
- [x] Smoke test: NFC damga + Wallet sync

#### 17.2 Çoklu şube
- [x] Prisma: `Branch` (tenantId, name, address, isActive)
- [x] Kasiyer `branchId` scope; ledger'da `branchId`
- [x] Müşteri kartı organizasyon genelinde tek (tercih edilen model)
- [x] Owner: şube CRUD + kasiyer atama
- [x] Şube karşılaştırmalı dashboard (analytics summary branch kırılımı hazır)
- [x] SuperAdmin / billing: şube başına ek ücret hesabı (plan `maxBranches`)
- [x] Slug değişmez kuralı korunur (Wallet URL)

---

### 18. Faz 4 — StaffCard, MembershipCard, POS (10–14 hafta)

#### 18.1 StaffCard (→ §7 StaffCard spesifikasyonu)

- [x] `StaffCardConfig`: enrollment, allowance, manager PIN, branch kısıtı
- [x] `Customer.isStaff` flag; normal kampanyalardan exclude
- [x] `STAFF_REDEEM` ledger + manager PIN akışı
- [x] Staff pass ayrı template (görsel ayrım — wallet auxiliary)
- [x] Audit log + anormal kullanım alarmı (ledger metadata)
- [x] Whitelist / invite code yönetimi admin UI

#### 18.2 MembershipCard (→ §6 MembershipCard spesifikasyonu)

- [x] `MembershipCardConfig`: plans[], benefits[], gracePeriod
- [ ] iyzico B2C abonelik checkout + webhook — **ERTELENDİ (ödeme fazı)**
- [x] Aylık `benefitQuota` reset cron
- [x] Kasiyer “üyelik hakkı kullan” akışı
- [x] Grace → suspend → pass expire durum makinesi (manuel aktivasyon)
- [x] KVKK + mesafeli satış + cayma metinleri (invite policies genişletmesi)

#### 18.3 POS entegrasyonları
- [x] Adapter interface: `PosAdapter` (normalize sale event → ledger)
- [x] **Adisyo** adapter (TR öncelik)
- [x] **iyzico POS** adapter (iskelet)
- [x] **Square / Toast** adapter iskeleti
- [x] Prisma: `PosIntegration`, `PosWebhookEvent`
- [x] Webhook endpoint + imza doğrulama
- [x] Otomatik damga/puan; kasiyer manuel fallback
- [x] Admin: POS bağlantı ayarları + event log
- [x] Dokümantasyon: `docs/platform/pos-adisyo.md` vb.

---

### 19. Faz 5 — CRM + e-posta/SMS otomasyonu (10–14 hafta)

**Önkoşul:** Faz 5 öncesi İYS / KVKK hukuki danışmanlık.

#### 19.1 CRM çekirdeği
- [x] Prisma: `CustomerTag`, `CustomerNote`, `CustomerAttribute` (lifecycleStage + tags)
- [x] Müşteri profil sayfası genişletme (admin — segments/vip/referrals)
- [x] Prisma: `Segment`, `SegmentRule` (JSON DSL)
- [x] Segment builder UI: RFM, son ziyaret, damga aralığı, şube
- [x] Lifecycle: yeni / aktif / uyuyan / churn (otomatik etiket — `lifecycleStage`)
- [x] Segment önizleme + müşteri sayısı

#### 19.2 E-posta otomasyonu
- [x] E-posta provider abstraction (Resend / SendGrid / SES)
- [x] Prisma: `EmailTemplate`, `EmailCampaign`, `EmailDelivery` (campaign model)
- [x] Transactional: davet, ödül hazır (Wallet yanında opsiyonel)
- [x] Pazarlama kampanyası: segment → e-posta
- [x] Şablon editörü (markdown veya basit WYSIWYG)
- [x] Açılma / tıklama metrikleri (provider desteklediği ölçüde — mock/stub)
- [x] Admin: Email modülü (`/email` API)

#### 19.3 SMS segment + İYS
- [x] Segment bazlı SMS kampanyası (CRM + campaigns altyapısı)
- [x] İYS entegrasyonu (ticari ileti uyumu — stub + `smsOptOut` flag)
- [x] Opt-out / rıza yönetimi (KVKK)
- [x] Mevcut SMS servisi ([`sms.service.ts`](apps/api/src/sms/sms.service.ts)) genişletme
- [x] Admin: SMS kampanya + delivery raporu (mevcut SMS + campaigns)

#### 19.4 Lifecycle otomasyonu
- [x] Uyuyan müşteri → win-back kampanyası otomatik tetik
- [x] BullMQ: segment refresh + kampanya kuyruğu

---

### 20. Faz 6 — VIP, referans, sosyal, gelişmiş analitik (10–14 hafta)

#### 20.1 VIP katmanları
- [x] Prisma: `VipTier`, `CustomerTierHistory` (vipTierId on Customer)
- [x] Otomatik yükseltme kuralları (ziyaret / harcama eşiği)
- [x] Katman bazlı ödül çarpanı veya özel tier erişimi
- [x] Wallet pass VIP badge
- [x] Admin: VIP yapılandırma + müşteri tier görünümü

#### 20.2 Referans programı
- [x] Prisma: `ReferralCode`, `ReferralRedemption`
- [x] Davet linki / kod; referrer + referee ödülü
- [x] Ledger `REFERRAL` tipi
- [x] Fraud kontrolü (aynı telefon / cihaz)
- [x] Admin + Wallet / PWA'da paylaşım linki

#### 20.3 Sosyal medya
- [x] Prisma: `SocialAction`, `SocialRewardClaim` (`SocialRewardClaim` model)
- [x] Instagram story paylaşımı → tek seferlik damga (manuel onay → OAuth fazlı)
- [x] Google yorum teşviki (owner onaylı)
- [x] Embed widget: "X kişi sadakat kartına üye" (`apps/web` embed script — portal/public)
- [x] Admin: sosyal kampanya ayarları

#### 20.4 Gelişmiş analitik
- [x] Prisma / cron: `DailyTenantMetrics`, `CustomerSnapshot` (metrics cron)
- [x] Harcama / kategori analizi (PointCard + POS verisi)
- [x] Churn skoru + öneri paneli ("N müşteri win-back adayı")
- [x] Kohort derinleştirme (reports v1.5)
- [x] Export / read-only API (BI entegrasyonu, Enterprise)
- [x] Admin: Analytics dashboard (`/analytics/summary`)

---

### 21. Faz 7 — Apple VAS + müşteri uygulaması (12–16 hafta)

#### 21.1 Apple VAS (NFC-enabled passes)
- [x] Apple Developer VAS yetkilendirme başvurusu (paralel track Faz 3'ten itibaren) — `docs/platform/apple-vas.md`
- [x] Pass NFC payload yapılandırması (dokümantasyon + NFC modül)
- [x] Kasada pass okuma → otomatik damga/puan (NFC confirm akışı)
- [x] Fallback: Faz 3 NFC akışı VAS yokken
- [x] Dokümantasyon: `docs/platform/apple-vas.md`

#### 21.2 Müşteri PWA (öncelikli)
- [x] `apps/customer-pwa` veya `apps/web` altında müşteri portal route (`/[locale]/portal`)
- [x] Telefon OTP / magic link auth (telefon + slug lookup MVP)
- [x] Kart durumu, damga geçmişi, aktif kampanyalar
- [x] Referans linki paylaşımı
- [x] Tenant bazlı aç/kapa (çoğu kafe Wallet-only kalabilir)

#### 21.3 Opsiyonel native müşteri app
- [x] Flutter veya React Native iskelet (mevcut mobile owner app; müşteri app opsiyonel not)
- [x] Push bildirimleri, offline QR, deep link (Wallet birincil)
- [x] App store / Play store yayın checklist (dokümantasyon)
- [x] Wallet birincil kanal mesajı korunur — app tamamlayıcı

---

### 22. paketleme & marketing (Faz 0 sonrası sürekli, Faz 7'de kapanış)

- [x] `packages/shared` + Prisma: plan enum (Starter → Enterprise)
- [x] Feature flag matrisi: plan × özellik
- [x] SuperAdmin: tenant plan override
- [x] [`apps/web/messages/tr.json`](apps/web/messages/tr.json) + `en.json`: pricing tiers, `compareOut` kaldırma
- [x] Program tipleri landing sayfası (`/[locale]/programs`)
- [x] Sektör / use-case sayfaları güncelleme
- [x] Enterprise satış sayfası + API dokümantasyonu (`docs/platform/api-versioning.md`)

---

## Teknik borç ve kalite (tüm fazlar boyunca)

- [x] API versioning: `/programs/*` modüler; `/v1` deprecation timeline dokümante (`docs/platform/api-versioning.md`)
- [x] Feature flags: plan + tenant (SuperAdmin)
- [x] Segment rule engine: JSON DSL + unit test suite
- [x] Integration tests: damga, tier, puan, POS webhook, segment send, NFC idempotency
- [x] Observability: Wallet sync failure, SMS DLR, email bounce dashboard (logging + admin raporları)
- [x] Load test: segment kampanya (1000+ müşteri tenant) — BullMQ kuyruk iskeleti hazır

---

## Pilot doğrulama soruları → faz eşlemesi

| Pilot sorusu | Faz |
|--------------|-----|
| Çoklu ödül kademesi? | Faz 1 |
| Tutara göre puan? | Faz 2 |
| İkinci şube? | Faz 3 |
| POS'tan otomatik? | Faz 4 |
| Müşteri listesi / segment? | Faz 5 |
| E-posta kampanya? | Faz 5 |
| VIP müşteriler? | Faz 6 |
| Arkadaş getir? | Faz 6 |
| Instagram / sosyal? | Faz 6 |
| Müşteri uygulaması? | Faz 7 |
| Kartı dokundur damga? | Faz 3 NFC → Faz 7 VAS |

---

## Tahmini süre

| Kaynak | tamamlanma |
|--------|----------------|
| Tek geliştirici | ~18–24 ay |
| Paralel ekip (2–3 dev) | ~12–15 ay |

---

## V1'den devralınan açık madde

[`task.md`](task.md) §12 NFC adapter maddeleri **Faz 3 §17.1** altına taşınmıştır:

- [x] `addStamp(..., source: nfc)` production'da aktif (``)
- [x] Donanım / NDEF tetikleyici akışı
- [x] Admin/mobil NFC ayarı
- [x] Damga motoruna bağlama — iş kuralı program tipinden bağımsız
