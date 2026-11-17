# Dokun & Kazan — Tamamlama Checklist

> **Durum (2026-09-02):** Ürün kodu tamam; P4 ops açık.  
> **Kapsam dışı:** iyzico / ödeme entegrasyonları.

---

## P0–P3 ✅

Tamamlandı.

**Son tamamlananlar:**
- [x] Sidebar `email` / `social` menü anahtarları (Business+)
- [x] E-posta segment hedefleme (API + admin)
- [x] Resend e-posta provider (`EMAIL_PROVIDER=resend`)
- [x] Sosyal modül paket kilidi (Business / `crm` feature)
- [x] Reward “yakında” dead copy kaldırıldı

---

## P4 — Prod altyapı (ops)

- [ ] Apple APNs prod sertifikaları
- [ ] Google Wallet SA prod
- [ ] SMS prod + İYS canlı API
- [ ] R2 prod bucket
- [ ] `pnpm verify:prod-env --strict` prod `.env` ile yeşil

---

## İlerleme özeti

| Faz | Durum |
|-----|--------|
| P0–P3 | 100% |
| P4 | ~40% (araçlar hazır) |

**Migration:** DB güncel (`prisma migrate status`)

**Test:** `pnpm --filter @ngl/api test` · `pnpm --filter @ngl/admin test:e2e`
