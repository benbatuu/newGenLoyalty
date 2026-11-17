import {
  cryptoRandomId,
  type EmailDocument,
  type EmailTheme,
} from './email-document';

export type EmailSectorId =
  | 'kafe'
  | 'restoran'
  | 'perakende'
  | 'guzellik'
  | 'spor';

export type EmailStarterTemplate = {
  id: string;
  sectorId: EmailSectorId;
  sectorLabel: string;
  name: string;
  subject: string;
  description: string;
  document: EmailDocument;
};

export const EMAIL_SECTORS: { id: EmailSectorId; label: string }[] = [
  { id: 'kafe', label: 'Kafe & kahve' },
  { id: 'restoran', label: 'Restoran' },
  { id: 'perakende', label: 'Perakende & butik' },
  { id: 'guzellik', label: 'Güzellik & bakım' },
  { id: 'spor', label: 'Spor & fitness' },
];

function theme(partial: EmailTheme): EmailTheme {
  return partial;
}

function doc(blocks: EmailDocument['blocks'], t: EmailTheme): EmailDocument {
  return { version: 1, theme: t, blocks };
}

const STARTERS: EmailStarterTemplate[] = [
  // —— Kafe ——
  {
    id: 'kafe-cift-damga',
    sectorId: 'kafe',
    sectorLabel: 'Kafe & kahve',
    name: 'Hafta sonu çift damga',
    subject: 'Bu hafta sonu her damga iki kat!',
    description: 'Sadakat kartı çift damga kampanyası',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Çift damga hafta sonu', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Merhaba {customerFirstName},\n\nCumartesi ve Pazar günleri {businessName}’de aldığınız her damga iki kat sayılıyor. Favori kahvenizi içerken kartınızı hızla doldurun.',
        },
        {
          id: cryptoRandomId(),
          type: 'image',
          url: 'https://picsum.photos/seed/ngl-kafe-weekend/560/280',
          alt: 'Kahve ve damga kartı',
          align: 'center',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Konum & saatler', url: '' },
      ],
      theme({ primaryColor: '#4A3728', backgroundColor: '#F5F0EB', headingColor: '#2C1810' }),
    ),
  },
  {
    id: 'kafe-yeni-tat',
    sectorId: 'kafe',
    sectorLabel: 'Kafe & kahve',
    name: 'Yeni tat duyurusu',
    subject: 'Menümüze yeni tat eklendi',
    description: 'Yeni ürün lansmanı',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Yeni tat: {businessName}’den haber var', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Bu ay menümüze eklediğimiz özel karışımı denediniz mi? İlk siparişinizde ekstra damga kazanın.',
        },
        {
          id: cryptoRandomId(),
          type: 'image',
          url: 'https://picsum.photos/seed/ngl-kafe-new/560/280',
          alt: 'Yeni içecek',
          align: 'center',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Menüyü gör', url: '' },
      ],
      theme({ primaryColor: '#1B4332', backgroundColor: '#EDF3EC' }),
    ),
  },
  {
    id: 'kafe-dogum-gunu',
    sectorId: 'kafe',
    sectorLabel: 'Kafe & kahve',
    name: 'Doğum günü kahvesi',
    subject: 'Doğum gününüz kutlu olsun — hediyemiz var',
    description: 'Doğum günü ödülü',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Doğum gününüz kutlu olsun!', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: '{businessName} ailesi olarak doğum gününüzü kutluyoruz. Bu ay içinde bize uğradığınızda ikram kahveniz bizden.',
        },
        { id: cryptoRandomId(), type: 'spacer', size: 'sm' },
        { id: cryptoRandomId(), type: 'button', label: 'Rezervasyon yap', url: '' },
      ],
      theme({ primaryColor: '#9F2F2D', backgroundColor: '#FDEBEC', headingColor: '#5C1F1E' }),
    ),
  },

  // —— Restoran ——
  {
    id: 'restoran-menu',
    sectorId: 'restoran',
    sectorLabel: 'Restoran',
    name: 'Özel menü duyurusu',
    subject: 'Bu akşam özel menümüz serviste',
    description: 'Mevsimsel menü tanıtımı',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Mevsim menüsü başladı', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: '{businessName}’de şefimizin hazırladığı yeni mevsim menüsünü keşfedin. Sadakat kartınızı getirmeyi unutmayın — her ziyarette damga kazanın.',
        },
        {
          id: cryptoRandomId(),
          type: 'image',
          url: 'https://picsum.photos/seed/ngl-rest-menu/560/280',
          alt: 'Özel menü',
          align: 'center',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Rezervasyon', url: '' },
      ],
      theme({ primaryColor: '#7C4A2D', backgroundColor: '#FBF3DB', headingColor: '#3D2418' }),
    ),
  },
  {
    id: 'restoran-hatirlatma',
    sectorId: 'restoran',
    sectorLabel: 'Restoran',
    name: 'Rezervasyon hatırlatması',
    subject: 'Bu akşam sizi bekliyoruz',
    description: 'Rezervasyon onayı',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Rezervasyonunuz onaylandı', level: 2 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Merhaba {customerFirstName},\n\n{businessName}’de bu akşamki rezervasyonunuz için hazırız. Geldiğinizde sadakat kartınızı okutarak damga kazanabilirsiniz.',
        },
        { id: cryptoRandomId(), type: 'divider' },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Planınız değiştiyse lütfen bizi arayın — masanızı başka misafirlere açalım.',
        },
      ],
      theme({ primaryColor: '#111111', backgroundColor: '#F7F6F3' }),
    ),
  },
  {
    id: 'restoran-odul',
    sectorId: 'restoran',
    sectorLabel: 'Restoran',
    name: 'Sadakat ödülü',
    subject: 'Ödülünüz hazır — gelin kullanın',
    description: 'Tam dolu kart ödülü',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Tebrikler, ödülünüz hazır!', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Sadakat kartınız doldu. {businessName}’de bir sonraki ziyaretinizde ana yemek ikramımız sizden.',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Konumu aç', url: '' },
      ],
      theme({ primaryColor: '#346538', backgroundColor: '#EDF3EC' }),
    ),
  },

  // —— Perakende ——
  {
    id: 'perakende-sezon',
    sectorId: 'perakende',
    sectorLabel: 'Perakende & butik',
    name: 'Sezon indirimi',
    subject: 'Sezon sonu — sadakat üyelerine ekstra %15',
    description: 'Sezon kampanyası',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Sezon indirimi başladı', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: '{businessName} sadakat üyelerine seçili ürünlerde ekstra %15 indirim. Mağazaya gelirken dijital kartınızı yanınızda bulundurun.',
        },
        {
          id: cryptoRandomId(),
          type: 'image',
          url: 'https://picsum.photos/seed/ngl-retail-sale/560/280',
          alt: 'Sezon indirimi',
          align: 'center',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Mağazayı ziyaret et', url: '' },
      ],
      theme({ primaryColor: '#1F6C9F', backgroundColor: '#E1F3FE' }),
    ),
  },
  {
    id: 'perakende-stok',
    sectorId: 'perakende',
    sectorLabel: 'Perakende & butik',
    name: 'Stoktaki son parçalar',
    subject: 'Son parçalar — kaçırmayın',
    description: 'Stok eritme',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Son parçalar', level: 2 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Beğendiğiniz ürünler tükenmeden uğrayın. {businessName}’de sadakat puanlarınızı da kullanabilirsiniz.',
        },
        { id: cryptoRandomId(), type: 'spacer', size: 'md' },
        { id: cryptoRandomId(), type: 'button', label: 'Ürünlere göz at', url: '' },
      ],
      theme({ primaryColor: '#111111', cardBackground: '#FFFFFF' }),
    ),
  },
  {
    id: 'perakende-vip',
    sectorId: 'perakende',
    sectorLabel: 'Perakende & butik',
    name: 'VIP erken erişim',
    subject: 'Yeni koleksiyon — siz önce görün',
    description: 'VIP erken erişim',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'VIP erken erişim', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Sadakat seviyeniz sayesinde yeni koleksiyonumuzu herkesten önce siz keşfedin. {businessName}’ye özel davetlisiniz.',
        },
        {
          id: cryptoRandomId(),
          type: 'image',
          url: 'https://picsum.photos/seed/ngl-retail-vip/560/280',
          alt: 'Yeni koleksiyon',
          align: 'center',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Koleksiyonu gör', url: '' },
      ],
      theme({ primaryColor: '#5C4D7A', backgroundColor: '#F3F0F7' }),
    ),
  },

  // —— Güzellik ——
  {
    id: 'guzellik-randevu',
    sectorId: 'guzellik',
    sectorLabel: 'Güzellik & bakım',
    name: 'Randevu hatırlatması',
    subject: 'Yarınki randevunuz — {businessName}',
    description: 'Randevu hatırlatma',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Randevu hatırlatması', level: 2 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Merhaba {customerFirstName},\n\nYarın {businessName}’de randevunuz var. Geldiğinizde sadakat kartınızı okutmayı unutmayın — her ziyaret puan kazandırır.',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Randevuyu yönet', url: '' },
      ],
      theme({ primaryColor: '#9F5A7A', backgroundColor: '#FDEBF3', headingColor: '#5C2F42' }),
    ),
  },
  {
    id: 'guzellik-yeni-hizmet',
    sectorId: 'guzellik',
    sectorLabel: 'Güzellik & bakım',
    name: 'Yeni hizmet lansmanı',
    subject: 'Salonumuzda yeni hizmet: siz deneyin',
    description: 'Hizmet tanıtımı',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Yeni hizmetimiz yayında', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: '{businessName}’de yeni bakım paketimizi tanıttık. İlk randevuda sadakat puanı iki kat.',
        },
        {
          id: cryptoRandomId(),
          type: 'image',
          url: 'https://picsum.photos/seed/ngl-beauty-new/560/280',
          alt: 'Yeni hizmet',
          align: 'center',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Randevu al', url: '' },
      ],
      theme({ primaryColor: '#B8860B', backgroundColor: '#FBF3DB' }),
    ),
  },
  {
    id: 'guzellik-referans',
    sectorId: 'guzellik',
    sectorLabel: 'Güzellik & bakım',
    name: 'Referans ödülü',
    subject: 'Arkadaşını getir — ikiniz de kazanın',
    description: 'Referans kampanyası',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Arkadaşını getir', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Bir arkadaşınızı {businessName}’ye davet edin; ikiniz de bir sonraki randevuda indirim kazanın.',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Davet kodunu paylaş', url: '' },
      ],
      theme({ primaryColor: '#346538', backgroundColor: '#EDF3EC' }),
    ),
  },

  // —— Spor ——
  {
    id: 'spor-uyelik',
    sectorId: 'spor',
    sectorLabel: 'Spor & fitness',
    name: 'Üyelik yenileme',
    subject: 'Üyeliğiniz yenileme zamanı',
    description: 'Üyelik hatırlatması',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Üyeliğinizi yenileyin', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: '{businessName} ailesinde kalmaya devam edin. Bu ay yenileyen üyelere ekstra sadakat puanı tanımlıyoruz.',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Üyeliği yenile', url: '' },
      ],
      theme({ primaryColor: '#1F6C9F', backgroundColor: '#E1F3FE' }),
    ),
  },
  {
    id: 'spor-program',
    sectorId: 'spor',
    sectorLabel: 'Spor & fitness',
    name: 'Yeni ders programı',
    subject: 'Yeni ders programımız yayında',
    description: 'Program duyurusu',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Yeni ders programı', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Pilates, spin ve güç antrenmanı saatleri güncellendi. {businessName}’de kartınızı okutarak katılım damgası kazanın.',
        },
        {
          id: cryptoRandomId(),
          type: 'image',
          url: 'https://picsum.photos/seed/ngl-gym-class/560/280',
          alt: 'Grup dersi',
          align: 'center',
        },
        { id: cryptoRandomId(), type: 'button', label: 'Programı gör', url: '' },
      ],
      theme({ primaryColor: '#111111', backgroundColor: '#F0F0F0' }),
    ),
  },
  {
    id: 'spor-arkadas',
    sectorId: 'spor',
    sectorLabel: 'Spor & fitness',
    name: 'Arkadaşını getir',
    subject: 'Bir arkadaşınla gel — ikna edici teklif',
    description: 'Bring a friend',
    document: doc(
      [
        { id: cryptoRandomId(), type: 'heading', text: 'Arkadaşını getir kampanyası', level: 1 },
        {
          id: cryptoRandomId(),
          type: 'paragraph',
          text: 'Bu hafta {businessName}’ye getirdiğiniz her yeni üye için ikinize de bir antrenman hediye ediyoruz.',
        },
        { id: cryptoRandomId(), type: 'spacer', size: 'sm' },
        { id: cryptoRandomId(), type: 'button', label: 'Salonu ziyaret et', url: '' },
      ],
      theme({ primaryColor: '#E85D04', backgroundColor: '#FFF4ED', headingColor: '#7A2E00' }),
    ),
  },
];

export function listEmailStarters(): EmailStarterTemplate[] {
  return STARTERS;
}

export function getEmailStarter(id: string): EmailStarterTemplate | undefined {
  return STARTERS.find((s) => s.id === id);
}

export function listEmailStartersBySector(
  sectorId: EmailSectorId,
): EmailStarterTemplate[] {
  return STARTERS.filter((s) => s.sectorId === sectorId);
}
