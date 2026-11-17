# Mobil Güvenlik + Clean Code Refactor — Görev Listesi

> **Başlangıç:** 2026-09-03  
> **Kaynak plan:** `.cursor/plans/mobile_hardening_refactor_52bf40de.plan.md`  
> **Önceki yol haritası:** [`task_roadmap.md`](task_roadmap.md)

---

## İlerleme özeti

| Faz | Odak | Durum |
|-----|------|-------|
| **M1** | Güvenlik (demo creds, HTTPS, cleartext, QR log) | ✅ |
| **M2** | Oturum + secure token storage | ✅ |
| **M3** | Push servisi lifecycle | ✅ |
| **M4** | Ölü kod + menü bağlantıları | ✅ |
| **M5** | `models.dart` parçalama | ✅ |
| **M6** | `api_client.dart` parçalama | ✅ |
| **M7** | Counter refactor (controller + panels) | ✅ |
| **M8** | Test, lint, CI | ✅ |

**Test:** `cd apps/mobile && flutter analyze && flutter test`

---

## M1 — Güvenlik

- [x] **M1.1** Demo credential'ları yalnızca `kDebugMode` — `login_screen.dart`, `staff_screen.dart`
- [x] **M1.2** HTTPS production default — `config.dart`, `README.md`
- [x] **M1.3** Cleartext release kapalı — `AndroidManifest.xml` + debug overlay
- [x] **M1.4** QR log sızıntısı — `pass_qr_scan_screen.dart`

---

## M2 — Oturum ve token

- [x] **M2.1** `flutter_secure_storage` + `secure_token_store.dart` + SharedPreferences migration
- [x] **M2.2** `onSessionExpired` callback → `AuthState.logout()`
- [x] **M2.3** Cold start token ping (`/auth/me`)

---

## M3 — Push

- [x] **M3.1** Token refresh listener cancel on teardown
- [x] **M3.2** iOS background handler platform options

---

## M4 — Ölü kod

- [x] **M4.1** Sil: `program_screen.dart`, `cafe_screen.dart`
- [x] **M4.2** Bağla: `business_screen.dart`, `reports_screen.dart` → `account_screen.dart`

---

## M5 — Models parçalama

- [x] **M5.1** `lib/models/*` domain dosyaları
- [x] **M5.2** `models.dart` barrel export

---

## M6 — API parçalama

- [x] **M6.1** `lib/api/api_exception.dart`
- [x] **M6.2** `lib/api/api_client.dart` (core)
- [x] **M6.3** Domain API extension dosyaları
- [x] **M6.4** `api_client.dart` barrel re-export

---

## M7 — Counter refactor

- [x] **M7.1** `CounterController` (ChangeNotifier)
- [x] **M7.2** `CounterScanHandler`
- [x] **M7.3** Panel widget'ları (`lib/features/counter/widgets/*`)
- [x] **M7.4** `counter_screen.dart` 247 satır
- [x] **M7.5** `home_shell.dart` import güncellendi

---

## M8 — Test ve CI

- [x] **M8.1** Unit testler: phone_utils, pass_barcode, asset_urls, auth_session
- [x] **M8.2** Lint: deprecated `activeColor`, gereksiz import
- [x] **M8.3** CI: `flutter analyze` + `flutter test` job
- [x] **M8.4** README güncelle

---

## Tamamlanma kriterleri

- [x] `flutter analyze` — 0 error, 0 warning
- [x] `flutter test` — tüm testler geçer
- [x] Release build HTTP kullanmaz; demo credential yok
- [x] Token'lar secure storage'da; refresh 401 → login ekranı
- [x] `counter_screen.dart` < 400 satır
- [x] Ölü ekranlar silindi; Business + Reports profile'dan erişilebilir

---

## Manuel smoke

1. Debug: `flutter run --dart-define=API_URL=http://10.0.2.2:3001`
2. Login, tezgâh arama, damga, QR scan
3. Token expire → otomatik logout
4. Owner profile → Davet sayfası + Raporlar
5. Push toggle (owner cihaz)
