# Dokun & Kazan — V3 Yol Haritası (Görev Listesi)

> **Durum (2026-09-02):** Ödeme, sertifika, SMS ve e-posta görevleri **ertelendi** (sistem tamamlandıktan sonra).  
> **Önceki checklist:** [`task_completion.md`](task_completion.md)  
> **Ertelenen faz:** Son aşama — P4 creds, A1 iyzico, B3 WhatsApp, C4 İYS, M3 e-posta tracking

**Sabit kararlar:** Türkiye first · Wallet birincil müşteri kanalı · Flutter = personel

---

## İlerleme özeti

| Faz | Odak | Durum |
|-----|------|-------|
| **P4** | Prod altyapı | ⏸ Ertelendi (sertifika + SMS) |
| **A** | Canlıya çıkış | ✅ Kod tamam (A1 ödeme hariç) |
| **B** | Müşteri değeri | ✅ Kod tamam (B3 WhatsApp hariç) |
| **C** | Büyüme | ✅ Kod tamam (C4 İYS hariç) |
| **D** | Enterprise moat | ✅ Kısmi (D1 white-label ops, D5 araştırma) |

**Test:** `pnpm --filter @ngl/api test` (21 test) · `pnpm --filter @ngl/admin test:e2e`

---

## ⏸ ERTELENEN — Sistem sonrası

### P4 — Prod altyapı
- [ ] **P4.1** Apple APNs prod sertifikaları
- [ ] **P4.2** Google Wallet SA prod
- [ ] **P4.3** SMS prod provider
- [ ] **P4.4** İYS canlı API
- [ ] **P4.8** Prod smoke: SMS davet
- [ ] **P4.5–P4.7, P4.9** R2, wallet smoke, rollout (prod env ile)

### A1 — iyzico (tüm maddeler)
- [ ] A1.1 – A1.9

### B3 — WhatsApp davet
- [ ] B3.1 – B3.6

### C4 — İYS uyum paneli
- [ ] C4.1 – C4.4

### M3 — E-posta tracking
- [ ] Resend webhook açılma/tıklama

### C2.2 — SMS/e-posta zinciri
- [ ] Win-back SMS/e-posta otomasyonu (owner push alternatifi mevcut)

---

## ✅ TAMAMLANAN

### A2 — Test ve kalite
- [x] **A2.1–A2.3, A2.7** E2E: login, email field, auth redirect
- [x] **A2.5–A2.6** API unit: portal , POS TR adapters
- [ ] **A2.4** Billing webhook (A1 ile birlikte ertelendi)
- [ ] **A2.8** Coverage threshold (opsiyonel)

### A3 — Admin güvenlik
- [x] **A3.1–A3.4** Next.js middleware + session cookie + cashier/suspended gate

### B1 — müşteri portalı
- [x] **B1.1–B1.5, B1.7** API programs + history, web UI, footer/sitemap
- [ ] **B1.6** PWA service worker (opsiyonel — atlandı)

### B2 — Table tent gerçek kayıt QR
- [x] **B2.1–B2.6** `/wallet/enroll/:slug`, self-enroll, PNG QR, rate limit, onboarding adımı

### B4 — Sosyal ödüller
- [x] **B4.1–B4.7** Public claim API, web form, auto-stamp on approve, rollout açık

### C1 — TR POS
- [x] **C1.1–C1.3, C1.6** Simpra, Menulux, Restajet adapters + docs
- [x] **C1.4–C1.5** Admin provider dropdown + event log (mevcut)

### C2 — RFM / win-back
- [x] **C2.1, C2.4** Segment preset'leri + kampanya öneri kartları
- [x] **C2.3** Kampanya öneri API (`/analytics/campaign-suggestions`)
- [ ] **C2.2** SMS/e-posta zinciri (ertelendi)

### C3 — Şube dashboard
- [x] **C3.1–C3.4** BranchDailyMetrics, `/analytics/branches`, raporlar tablosu

### C5 — Flutter parity
- [x] **C5.1–C5.5** Puan, cashback, indirim, multi-stamp, invite picker
- [ ] **C5.6** Offline queue (opsiyonel)

### D — Enterprise
- [x] **D2.1–D2.2** Tenant API key CRUD (`/tenants/me/api-keys`)
- [x] **D3.1–D3.3** GiftCredit model + API
- [x] **D4.1–D4.3** AI kampanya önerileri (düşük trafik günü)
- [ ] **D1** White-label subdomain (infra — ertelendi)
- [ ] **D5** Rezervasyon entegrasyonu (araştırma notu)

### M — İyileştirmeler
- [x] **M2** Happy hour (`startTime`/`endTime` multiplier config)
- [x] **M4** NFC auto-stamp (passCode + kayıtlı müşteri)
- [x] **M7** Sitemap `/programs`, portal link
- [ ] **M1** Google multi-program save URL (kısmi — invite page mevcut)
- [ ] **M5** Kohort/LTV raporları (temel branch metrics eklendi)
- [ ] **M6** İnteraktif onboarding wizard (checklist genişletildi)
- [ ] **M8** Owner push genişletme

---

## Sonraki adım (ertelenen faz)

1. P4 prod credential'ları (APNs, Google SA, R2)
2. SMS + İYS canlı
3. iyzico self-serve
4. WhatsApp davet
5. E-posta tracking + win-back SMS/e-posta zinciri

---

## Notlar

- Migration: `20260902230000_v3_social_enroll_api`
- Sosyal ödüller: `ROLLOUT_FLAGS.socialRewards = true`
- Self-enroll: `GET/POST /wallet/enroll/:slug`
- Portal : `POST /public/portal` → `programs[]`, `history[]`
