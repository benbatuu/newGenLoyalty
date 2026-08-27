# Dokun & Kazan — NFC Tabanlı Dijital Sadakat Kartı Sistemi
## Küçük Butik Kafeler İçin Proje Planı

**Konsept Özeti:** Uygulama indirmeden, QR okutmadan, sadece telefonu dokundurarak çalışan; Apple/Google Wallet'a entegre, küçük kafelerin bütçesine uygun (ayda $15-30) minimal bir dijital damga kartı sistemi.

---

## 1. Problem Tanımı ve Pazar Doğrulaması

### 1.1 Kanıtlanmış Problem

Mevcut sadakat sistemleri (Smile.io, Fivestars, Punchh gibi) küçük işletmeler için hem fazla pahalı hem de fazla karmaşık:

- Küçük işletme sahipleri, kullanmadıkları özellikler için (VIP program, segmentasyon, çoklu şube yönetimi) ayda $50-500 arası ödemek zorunda kalıyor.
- İşletmeler, en üst pakette sadece "puan" özelliğini kullandıklarını, geri kalan her şeyin gereksiz olduğunu belirtiyor.
- Müşteri tarafında da ciddi bir sürtünme var: yeni bir uygulama indirmek, kayıt formunu doldurmak, QR kod okutmaya çalışmak — bunların hepsi müşteriyi yoruyor ve kullanım oranını düşürüyor.

### 1.2 Neden Şimdi?

- Apple Wallet ve Google Wallet artık iOS/Android'de varsayılan olarak kurulu; ekstra uygulama indirmeye gerek yok.
- NFC teknolojisi hem iPhone hem Android telefonlarda standart hale geldi (temassız ödeme sayesinde kullanıcılar zaten NFC dokunuşuna alışkın).
- Küçük işletmeler için "basit ve ucuz" segmentinde ciddi bir boşluk var — büyük oyuncular kurumsal müşteriye odaklanıyor.

### 1.3 Hedef Kullanıcı Profili

**Birincil müşteri (B2B — bizim asıl ödeme yapan tarafımız):**
- 1-3 şubeli bağımsız kafe/kahveci
- Aylık 500-3000 işlem hacmi
- Mevcut bir POS sistemi var (Square, Toast, iyzico POS, Adisyo vb.) veya basit bir kasa kullanıyor
- Teknik bilgisi sınırlı, kurulumun 10 dakikadan uzun sürmesini istemiyor

**İkincil kullanıcı (son müşteri — ödeme yapmayan ama deneyimi belirleyen taraf):**
- Kafeye haftada 2+ kez gelen düzenli müşteriler
- Yeni bir uygulama indirmeye direnç gösteren, ama Wallet'a kart eklemeye açık kullanıcılar

---

## 2. Ürün Vizyonu ve Konumlandırma

> "Karmaşık bir CRM değil, sadece dijital bir damga kartı."

**Rakiplerden farkımız:**

| Özellik | Bizim Ürün | Smile.io / Fivestars |
|---|---|---|
| Müşteri tarafı app indirme | Hayır | Bazen gerekli |
| QR kod okutma | Hayır (NFC dokunuşu) | Genelde evet |
| Kurulum süresi | ~10 dakika | Günler (entegrasyon) |
| Fiyat | $15-30/ay | $50-500/ay |
| Özellik kapsamı | Sadece damga + ödül | CRM, segmentasyon, email pazarlama, VIP katmanları |
| Hedef kitle | Tek/az şubeli küçük işletme | Büyüyen/kurumsal markalar |

---

## 3. Teknik Mimari

### 3.1 Sistem Bileşenleri

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Kasiyer Uygulaması │────▶│   Backend API     │────▶│  Apple/Google    │
│  (Tablet/Telefon) │     │  (Damga Motoru)    │     │  Wallet Push     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                  │
                                  ▼
                          ┌──────────────────┐
                          │  Admin Dashboard   │
                          │  (Kafe sahibi için)│
                          └──────────────────┘
```

### 3.2 NFC Akışı — Detaylı Teknik Yaklaşım

Önceki konuşmada belirttiğimiz gibi, tam otomatik "dokun ve hiçbir şey yapma" deneyimi (Apple Wallet kartının NFC ile doğrudan okunması) teknik olarak hâlâ kısıtlı. Bu yüzden **gerçekçi ve uygulanabilir** bir hibrit model öneriyorum:

#### Aşama 1 — Karta İlk Ekleme (Onboarding)
1. Kasiyer, müşterinin telefon numarasını POS/tablet uygulamasına girer (veya müşteri kendi telefonunda bir NFC tag'e dokunarak formu açar)
2. Backend, benzersiz bir müşteri ID'si oluşturur ve bir `.pkpass` (Apple) / Google Wallet JWT linki üretir
3. Müşteriye SMS ile link gönderilir: *"Kartını cüzdanına eklemek için dokun → [link]"*
4. Müşteri linke tıklar, kart otomatik Wallet'a eklenir

#### Aşama 2 — Damga Ekleme (NFC Dokunuşu ile)
1. Tezgahta bir **aktif NFC okuyucu** bulunur (POS'a USB/Bluetooth bağlı, ör. ACR122U benzeri bir okuyucu veya entegre POS NFC modülü)
2. Müşteri telefonunu okuyucuya dokundurur
3. **Kritik teknik nokta:** Telefon, Wallet kartının kendisini NFC ile "yayınlamıyor" (bu Apple'ın kısıtlaması). Bunun yerine iki pratik çözüm var:

   **Çözüm A — Telefon Numarası Eşleştirme (Önerilen, MVP için)**
   - NFC okuyucu, aslında telefonun NFC çipini "tetikleyici" olarak kullanır — telefon dokunduğunda otomatik olarak tarayıcıda önceden kaydedilmiş bir mini-web sayfası açılır (NDEF tag broadcast)
   - Bu sayfa, cihaz + tarayıcı cookie'siyle müşteriyi tanır (ilk kayıtta bir kere tanımlanmıştı)
   - Sayfa arka planda backend'e "damga ekle" isteği gönderir
   - Backend, Apple PassKit / Google Wallet API üzerinden push güncelleme yollar
   - Müşterinin cüzdanındaki kart 1-2 saniye içinde güncellenir, bildirim gelir

   **Çözüm B — Kasiyer Onaylı Hızlı Eşleştirme**
   - NFC dokunuşu, kasiyerin ekranında "Bu numarayla mı devam edelim: 05XX...XX45?" diye son kayıtlı müşteriyi otomatik önerir
   - Kasiyer tek tıkla onaylar
   - Bu, tam otomasyon değil ama saniyeler içinde tamamlanan bir akış

   > **Not:** Gerçek "temassız ödeme" seviyesinde bir deneyim (kartın kendisinin NFC ile yayın yapması) için Apple'ın "NFC-enabled passes" (VAS — Value Added Services) API'sine ihtiyaç var. Bu, Apple Developer Program'da ayrı bir yetkilendirme gerektiriyor ve büyük ölçekli iş ortaklıkları (ör. büyük perakende zincirleri) dışında pek erişilebilir değil. **MVP'de Çözüm A ile başlamak, VAS entegrasyonunu Faz 3'e ertelemek gerçekçi.**

#### Aşama 3 — Ödül Kullanma
1. Kart dolduğunda (ör. 10 damga), Wallet kartında otomatik "Ödülün Hazır!" bildirimi görünür
2. Müşteri kasiyere söyler, kasiyer sistemde "ödülü kullan" butonuna basar
3. Damga sayacı sıfırlanır, kart güncellenir

### 3.3 Donanım Gereksinimleri (Kafe Tarafı)

| Bileşen | Seçenek | Yaklaşık Maliyet |
|---|---|---|
| NFC okuyucu | USB/Bluetooth NFC reader (ör. ACR1252U) | $30-60 (tek seferlik) |
| Tablet/telefon (kasiyer app için) | Mevcut POS tableti kullanılabilir veya ucuz Android tablet | $0-150 |
| İnternet bağlantısı | Kafede zaten mevcut | $0 |

### 3.4 Yazılım Bileşenleri

1. **Kasiyer Uygulaması** (Web app veya basit native app)
   - Yeni müşteri kaydı
   - Damga ekleme/çıkarma
   - Ödül kullanma
   - Günlük özet (kaç damga verildi, kaç ödül kullanıldı)

2. **Backend API**
   - Müşteri veritabanı (telefon numarası, damga sayısı, kayıt tarihi)
   - Apple PassKit entegrasyonu (`.pkpass` üretimi + APNs push)
   - Google Wallet API entegrasyonu (JWT tabanlı kart nesnesi + REST push)
   - SMS gönderimi (Twilio veya yerel bir SMS API sağlayıcısı — Türkiye pazarı için Netgsm/İletimerkezi gibi)

3. **Admin Dashboard** (Kafe sahibi için)
   - Toplam müşteri sayısı
   - Aktif/pasif müşteri analizi
   - Basit raporlama (haftalık/aylık ziyaret sayısı)
   - Ödül kuralı ayarlama (kaç damgada ödül verileceği)

### 3.5 Önerilen Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Backend | Node.js (Express) veya Python (FastAPI) |
| Veritabanı | PostgreSQL |
| Apple Wallet | PassKit (Node `passkit-generator` kütüphanesi) |
| Google Wallet | Google Wallet API (resmi Node/Python SDK) |
| Kasiyer app | React (basit web app, tablet tarayıcısında çalışır — native app geliştirme maliyetini düşürür) |
| Admin dashboard | React + basit grafik kütüphanesi (Recharts) |
| SMS | Twilio (uluslararası) veya Netgsm (Türkiye) |
| Hosting | AWS/DigitalOcean (küçük ölçek için ucuz bir VPS yeterli) |

---

## 4. Özellik Listesi (Kapsamlı)

### 4.1 MVP (İlk Sürüm) Özellikleri
- [ ] Telefon numarasıyla müşteri kaydı + SMS link ile Wallet'a ekleme
- [ ] Kasiyer panelinden manuel/NFC ile damga ekleme
- [ ] Ödül tanımlama (ör. "10 damgada 1 bedava kahve")
- [ ] Ödül kullanma butonu
- [ ] Basit admin dashboard (müşteri sayısı, toplam damga, aktif kullanıcı)
- [ ] Apple Wallet + Google Wallet kart tasarımı (kafe logosu, renk teması ile özelleştirilebilir)

### 4.2 Faz 2 Özellikleri (Etkileşim Artırma)
- [ ] Doğum günü hatırlatması + otomatik ödül
- [ ] "X gündür gelmedi" uyarısı (kafe sahibine, sadık müşteriyi kaybetmemek için)
- [ ] Çoklu ödül kademesi (5 damgada küçük indirim, 10 damgada bedava ürün)
- [ ] Push bildirim ile kampanya duyurusu ("Bu hafta sonu 2. kahve %50 indirimli")

### 4.3 Faz 3 Özellikleri (Ölçeklenme)
- [ ] Çoklu şube desteği (zincir kafeler için)
- [ ] POS sistemleriyle doğrudan entegrasyon (Square, Adisyo, Toast API bağlantısı — damga otomatik eklensin, kasiyer manuel işlem yapmasın)
- [ ] Gerçek NFC "dokun ve otomatik damga" deneyimi (Apple VAS API entegrasyonu)
- [ ] Müşteri harcama analizi (hangi ürün en çok tercih ediliyor)
- [ ] Referans/arkadaş getirme ödülü

### 4.4 Kesinlikle Yapılmayacaklar (Kapsam Dışı — En Azından Başlangıçta)
- Kapsamlı CRM/segmentasyon araçları
- E-posta pazarlama otomasyonu
- Sosyal medya entegrasyonu
- Karmaşık VIP üyelik katmanları

---

## 5. Paketleme ve Fiyatlandırma

### Başlangıç Paketi — $15/ay
- Tek şube
- Sınırsız müşteri kaydı
- Temel damga + ödül sistemi
- Apple + Google Wallet desteği
- E-posta destek

### Standart Paket — $29/ay
- Tek şube
- Başlangıç paketindeki her şey +
- Doğum günü otomasyonu
- "Geri kazanma" kampanyaları (uzun süredir gelmeyen müşteriye otomatik SMS)
- Öncelikli destek

### Çoklu Şube Paketi — $29 + şube başına $10/ay
- 2+ şube desteği
- Merkezi dashboard (tüm şubeleri tek yerden görme)

**Kurulum ücreti:** Yok (bu, "büyük sistemlerin" yaptığı ilk sürtünme noktalarından biri — biz bunu ortadan kaldırarak fark yaratıyoruz)

**Donanım:** NFC okuyucu ayrı satılır (~$40, tek seferlik) veya kafe kendi tedarik edebilir (biz sadece uyumlu modelleri öneririz)

---

## 6. Kullanıcı Deneyimi Akışları

### 6.1 Kafe Sahibi Onboarding (Hedef: 10 dakika)
1. Web sitesinden kayıt ol, kafe bilgilerini gir (isim, logo, renk teması)
2. Ödül kuralını belirle ("Kaç damgada ne kazanılıyor?")
3. NFC okuyucuyu tablete/telefona bağla (basit eşleştirme rehberi)
4. Test müşterisiyle deneme yap
5. Kullanıma başla

### 6.2 Müşteri İlk Deneyimi
1. Kasiyer: "Sadakat kartımız var, telefon numaranızı alabilir miyim?"
2. Müşteri numarasını söyler, kasiyer sisteme girer
3. Müşteriye anında SMS gelir: *"Merhaba! [Kafe Adı] sadakat kartın hazır → [link]. Cüzdanına eklemek 5 saniye sürer."*
4. Müşteri linke tıklar → "Apple Wallet'a Ekle" butonunu görür → tıklar → kart cüzdanına düşer
5. İlk damga otomatik eklenir (o anki alışverişten)

### 6.3 Tekrar Ziyaret Deneyimi
1. Müşteri sipariş verir, öderken telefonunu NFC okuyucuya dokundurur (veya kasiyer numarayla arar)
2. Damga eklenir, Wallet kartı anlık güncellenir, telefon ekranında bildirim belirir: *"1 damga daha! 3 damga kaldı, bedava kahveye çok yakınsın ☕"*

### 6.4 Ödül Kullanma
1. Kart dolar, bildirim gelir: *"Tebrikler! Ödülün hazır 🎉"*
2. Müşteri bir sonraki ziyarette kasiyere söyler
3. Kasiyer "Ödülü Kullan" butonuna basar, sayaç sıfırlanır

---

## 7. Rakip Analizi

| Rakip | Güçlü Yanı | Zayıf Yanı | Fiyat |
|---|---|---|---|
| **Smile.io** | Güçlü marka, Shopify entegrasyonu | Küçük işletme için pahalı, e-ticaret odaklı | $49-999/ay |
| **Fivestars** | Kapsamlı pazarlama araçları | Karmaşık, uzun sözleşme süreleri | $89-300+/ay |
| **Loopy Loyalty** | Wallet tabanlı, bize en yakın rakip | QR kod okutma gerektiriyor, NFC yok | $45-105/ay |
| **Punchh** | Kurumsal müşteriler için güçlü | Küçük işletmeye hitap etmiyor | Özel fiyatlandırma (pahalı) |
| **Bizim Ürün** | NFC dokunuşu, en düşük fiyat, en basit kurulum | Marka bilinirliği yok (henüz) | $15-29/ay |

**Ana farklılaşma noktası:** Loopy Loyalty en yakın rakip ama onlar da QR koduna dayanıyor. NFC dokunuşu deneyimi + agresif fiyatlandırma, bizim asıl kama noktamız.

---

## 8. Regülasyon ve Veri Gizliliği

- **KVKK (Türkiye) / GDPR (AB) uyumluluğu:** Telefon numarası kişisel veri sayılır, açık rıza metni ve veri saklama politikası şart.
- **SMS gönderimi:** Ticari elektronik ileti onayı (Türkiye'de İYS - İleti Yönetim Sistemi kaydı gerekebilir).
- **Veri saklama:** Müşteri sadece telefon numarası + damga sayısı tutulmalı, gereksiz veri toplanmamalı (bu hem uyumluluğu kolaylaştırır hem güven inşa eder).

---

## 9. MVP Geliştirme Yol Haritası

| Hafta | Odak |
|---|---|
| 1-2 | Backend altyapısı, veritabanı tasarımı, Apple/Google Wallet API entegrasyon testi |
| 3-4 | Kasiyer web app (damga ekleme, ödül kullanma) |
| 5 | SMS entegrasyonu, onboarding akışı |
| 6 | NFC okuyucu entegrasyonu (Çözüm A akışı) |
| 7 | Admin dashboard |
| 8 | Test, hata düzeltme, 2-3 pilot kafede canlı deneme |

**Tahmini MVP süresi:** 6-8 hafta (tek geliştirici, AI destekli araçlarla)

---

## 10. Doğrulama Planı (Build Etmeden Önce)

1. **5-10 kafe sahibiyle görüşme** — Mevcut sadakat sistemi var mı? Neden kullanmıyorlar/bıraktılar? Ne kadar öderler?
2. **Elle simülasyon** — Gerçek bir kafede, kağıt üzerinde/basit bir Google Sheet ile damga sistemini birkaç hafta manuel yürüt, müşteri tepkisini gözlemle
3. **Sahte kapı testi (Fake door test)** — Basit bir landing page ile "İlgileniyorum" butonuna tıklayan kafe sayısını ölç
4. **Pilot ödeme testi** — 3-5 kafeden gerçek ön ödeme almayı dene (ürün olmadan bile). Para veren varsa, sinyal güçlüdür.

---

## 11. Riskler ve Dikkat Edilmesi Gerekenler

| Risk | Azaltma Stratejisi |
|---|---|
| Apple/Google Wallet API'lerinin öğrenme eğrisi yüksek | Mevcut açık kaynak kütüphaneleri (passkit-generator vb.) kullan, sıfırdan yazma |
| NFC okuyucu uyumluluk sorunları | MVP'de tek bir test edilmiş okuyucu modeliyle sınırlı kal, geniş donanım desteğini sonraya bırak |
| Kafe sahiplerinin teknolojiye direnci | Kurulumu maksimum basitleştir, video rehberler hazırla, ilk ay ücretsiz destek sun |
| Müşteri telefon numarası paylaşmak istemeyebilir | Değer önerisini net anlat ("sadece damga takibi için, spam yok") |
| Rakiplerin fiyat düşürmesi | Erken müşteri sadakati + NFC deneyimi farkını koru |

---

## 12. Başarı Metrikleri (KPI)

- Kafe başına aktif müşteri sayısı
- Damga → ödül dönüşüm oranı
- Kafe sahibi tutundurma oranı (churn rate)
- Ortalama kurulum süresi (hedef: <15 dakika)
- Aylık tekrarlayan gelir (MRR)
- Pilot kafelerden gelen NPS (memnuniyet skoru)

---

## 13. Sonraki Adımlar

- [ ] 5-10 yerel kafe sahibiyle keşif görüşmesi yapmak
- [ ] Apple Developer Program'a kayıt (PassKit sertifikası için gerekli, yıllık $99)
- [ ] Google Wallet API için Google Cloud hesabı açmak
- [ ] Test için 1-2 uyumlu NFC okuyucu satın almak
- [ ] Basit bir landing page + fake door test kurmak
- [ ] KVKK uyumluluğu için temel bir hukuki danışmanlık almak
- [ ] MVP geliştirmeye başlamadan önce en az 3 kafeden "evet, para öderim" onayı almak