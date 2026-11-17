export type CardElementType =
  | "TEXT"
  | "BARCODE"
  | "QR"
  | "LOGO"
  | "IMAGE"
  | "SHAPE"
  | "ICON"
  | "STAMP"
  | "POINTS"
  | "BALANCE";

export type CardElement = {
  type: CardElementType;
  id: string;

  x: number;
  y: number;
  width: number;
  height: number;

  zIndex?: number;
  opacity?: number;
  rotation?: number;

  // Text
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  color?: string;

  // Asset
  assetKey?: string;

  // Barcode / QR
  value?: string;
  format?: string;

  // Shape
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
};

export type ProgramCardDesign = {
  width: number;
  height: number;
  borderRadius: number;

  background: {
    type: "solid" | "gradient" | "image";
    color?: string;
    colors?: readonly string[];
    angle?: number;
    assetKey?: string;
  };

  elements: readonly CardElement[];
};

export const PROGRAM_CARD_DESIGNS = {
  // ============================================================
  // STAMP CARD
  // ============================================================

  STAMP_CARD: {
    width: 320,
    height: 200,
    borderRadius: 20,

    background: {
      type: "gradient",
      colors: ["#151515", "#292929"],
      angle: 135,
    },

    elements: [
      {
        type: "IMAGE",
        id: "decor-coffee",
        x: 190,
        y: -20,
        width: 150,
        height: 150,
        assetKey: "stamp-card-decoration",
        opacity: 0.18,
        rotation: -12,
        zIndex: 1,
      },

      {
        type: "LOGO",
        id: "logo",
        x: 20,
        y: 18,
        width: 42,
        height: 42,
        assetKey: "logo",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "brand",
        x: 72,
        y: 20,
        width: 150,
        height: 20,
        text: "{{brandName}}",
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "card-label",
        x: 72,
        y: 39,
        width: 150,
        height: 16,
        text: "LOYALTY",
        fontSize: 8,
        fontWeight: 500,
        letterSpacing: 1.5,
        color: "#FFFFFF",
        opacity: 0.55,
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "customer-name",
        x: 20,
        y: 76,
        width: 220,
        height: 28,
        text: "{{customerName}}",
        fontSize: 19,
        fontWeight: 700,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "stamp-label",
        x: 20,
        y: 111,
        width: 100,
        height: 15,
        text: "STAMPS",
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: 1.2,
        color: "#FFFFFF",
        opacity: 0.5,
        zIndex: 10,
      },

      {
        type: "STAMP",
        id: "stamps",
        x: 20,
        y: 128,
        width: 190,
        height: 35,
        assetKey: "stamp-progress",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "stamp-progress",
        x: 215,
        y: 131,
        width: 55,
        height: 24,
        text: "{{currentStamps}}/{{targetStamps}}",
        fontSize: 13,
        fontWeight: 700,
        align: "right",
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "BARCODE",
        id: "barcode",
        x: 20,
        y: 171,
        width: 180,
        height: 20,
        value: "{{memberId}}",
        format: "CODE128",
        zIndex: 20,
      },

      {
        type: "QR",
        id: "qr",
        x: 263,
        y: 145,
        width: 40,
        height: 40,
        value: "{{passQrValue}}",
        zIndex: 20,
      },
    ],
  },

  // ============================================================
  // MULTI STAMP
  // ============================================================

  MULTI_STAMP: {
    width: 320,
    height: 200,
    borderRadius: 20,

    background: {
      type: "gradient",
      colors: ["#111827", "#312E81"],
      angle: 145,
    },

    elements: [
      {
        type: "IMAGE",
        id: "decor-pattern",
        x: 180,
        y: 0,
        width: 160,
        height: 200,
        assetKey: "multi-stamp-pattern",
        opacity: 0.12,
        zIndex: 1,
      },

      {
        type: "LOGO",
        id: "logo",
        x: 20,
        y: 18,
        width: 40,
        height: 40,
        assetKey: "logo",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "brand",
        x: 70,
        y: 21,
        width: 180,
        height: 20,
        text: "{{brandName}}",
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "customer-name",
        x: 20,
        y: 70,
        width: 270,
        height: 26,
        text: "{{customerName}}",
        fontSize: 18,
        fontWeight: 700,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "coffee-label",
        x: 20,
        y: 108,
        width: 80,
        height: 15,
        text: "COFFEE",
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 1.1,
        color: "#FFFFFF",
        opacity: 0.55,
        zIndex: 10,
      },

      {
        type: "STAMP",
        id: "coffee-stamps",
        x: 20,
        y: 126,
        width: 115,
        height: 28,
        assetKey: "coffee-stamp-progress",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "coffee-count",
        x: 140,
        y: 128,
        width: 40,
        height: 20,
        text: "{{coffeeStamps}}/6",
        fontSize: 11,
        fontWeight: 700,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "dessert-label",
        x: 190,
        y: 108,
        width: 80,
        height: 15,
        text: "DESSERT",
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 1.1,
        color: "#FFFFFF",
        opacity: 0.55,
        zIndex: 10,
      },

      {
        type: "STAMP",
        id: "dessert-stamps",
        x: 190,
        y: 126,
        width: 80,
        height: 28,
        assetKey: "dessert-stamp-progress",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "dessert-count",
        x: 272,
        y: 128,
        width: 28,
        height: 20,
        text: "{{dessertStamps}}/4",
        fontSize: 9,
        fontWeight: 700,
        align: "right",
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "QR",
        id: "qr",
        x: 260,
        y: 18,
        width: 42,
        height: 42,
        value: "{{passQrValue}}",
        zIndex: 20,
      },

      {
        type: "BARCODE",
        id: "barcode",
        x: 20,
        y: 170,
        width: 170,
        height: 20,
        value: "{{memberId}}",
        format: "CODE128",
        zIndex: 20,
      },
    ],
  },

  // ============================================================
  // POINT CARD
  // ============================================================

  POINT_CARD: {
    width: 320,
    height: 200,
    borderRadius: 20,

    background: {
      type: "gradient",
      colors: ["#052E16", "#166534"],
      angle: 135,
    },

    elements: [
      {
        type: "IMAGE",
        id: "decor-points",
        x: 185,
        y: -30,
        width: 160,
        height: 160,
        assetKey: "points-decoration",
        opacity: 0.15,
        zIndex: 1,
      },

      {
        type: "LOGO",
        id: "logo",
        x: 20,
        y: 18,
        width: 42,
        height: 42,
        assetKey: "logo",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "brand",
        x: 72,
        y: 20,
        width: 170,
        height: 20,
        text: "{{brandName}}",
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "points-label",
        x: 20,
        y: 75,
        width: 100,
        height: 16,
        text: "YOUR POINTS",
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: 1.3,
        color: "#FFFFFF",
        opacity: 0.55,
        zIndex: 10,
      },

      {
        type: "POINTS",
        id: "points",
        x: 20,
        y: 92,
        width: 180,
        height: 42,
        text: "{{points}}",
        fontSize: 34,
        fontWeight: 800,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "redeem-hint",
        x: 20,
        y: 137,
        width: 180,
        height: 18,
        text: "Redeem on your next purchase",
        fontSize: 9,
        color: "#FFFFFF",
        opacity: 0.6,
        zIndex: 10,
      },

      {
        type: "QR",
        id: "qr",
        x: 255,
        y: 125,
        width: 48,
        height: 48,
        value: "{{passQrValue}}",
        zIndex: 20,
      },

      {
        type: "BARCODE",
        id: "barcode",
        x: 20,
        y: 171,
        width: 190,
        height: 20,
        value: "{{memberId}}",
        format: "CODE128",
        zIndex: 20,
      },
    ],
  },

  // ============================================================
  // CASHBACK CARD
  // ============================================================

  CASHBACK_CARD: {
    width: 320,
    height: 200,
    borderRadius: 20,

    background: {
      type: "gradient",
      colors: ["#172554", "#1E3A8A"],
      angle: 135,
    },

    elements: [
      {
        type: "IMAGE",
        id: "decor-cashback",
        x: 190,
        y: -20,
        width: 150,
        height: 150,
        assetKey: "cashback-decoration",
        opacity: 0.15,
        rotation: 10,
        zIndex: 1,
      },

      {
        type: "LOGO",
        id: "logo",
        x: 20,
        y: 18,
        width: 42,
        height: 42,
        assetKey: "logo",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "brand",
        x: 72,
        y: 21,
        width: 180,
        height: 20,
        text: "{{brandName}}",
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "balance-label",
        x: 20,
        y: 76,
        width: 120,
        height: 15,
        text: "STORE CREDIT",
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: 1.3,
        color: "#FFFFFF",
        opacity: 0.55,
        zIndex: 10,
      },

      {
        type: "BALANCE",
        id: "balance",
        x: 20,
        y: 92,
        width: 200,
        height: 42,
        text: "{{balance}}",
        fontSize: 32,
        fontWeight: 800,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "cashback-rate",
        x: 20,
        y: 139,
        width: 160,
        height: 18,
        text: "{{cashbackRate}}% cashback",
        fontSize: 10,
        fontWeight: 600,
        color: "#FFFFFF",
        opacity: 0.65,
        zIndex: 10,
      },

      {
        type: "QR",
        id: "qr",
        x: 255,
        y: 125,
        width: 48,
        height: 48,
        value: "{{passQrValue}}",
        zIndex: 20,
      },

      {
        type: "BARCODE",
        id: "barcode",
        x: 20,
        y: 171,
        width: 190,
        height: 20,
        value: "{{memberId}}",
        format: "CODE128",
        zIndex: 20,
      },
    ],
  },

  // ============================================================
  // DISCOUNT CARD
  // ============================================================

  DISCOUNT_CARD: {
    width: 320,
    height: 200,
    borderRadius: 20,

    background: {
      type: "gradient",
      colors: ["#7F1D1D", "#B91C1C"],
      angle: 135,
    },

    elements: [
      {
        type: "IMAGE",
        id: "decor-discount",
        x: 180,
        y: -15,
        width: 170,
        height: 170,
        assetKey: "discount-decoration",
        opacity: 0.14,
        rotation: -8,
        zIndex: 1,
      },

      {
        type: "LOGO",
        id: "logo",
        x: 20,
        y: 18,
        width: 42,
        height: 42,
        assetKey: "logo",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "brand",
        x: 72,
        y: 21,
        width: 170,
        height: 20,
        text: "{{brandName}}",
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "discount-value",
        x: 20,
        y: 72,
        width: 170,
        height: 50,
        text: "{{discountValue}}",
        fontSize: 42,
        fontWeight: 800,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "discount-label",
        x: 22,
        y: 122,
        width: 170,
        height: 18,
        text: "OFF YOUR PURCHASE",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: 1,
        color: "#FFFFFF",
        opacity: 0.65,
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "validity",
        x: 20,
        y: 148,
        width: 190,
        height: 18,
        text: "Valid until {{expiryDate}}",
        fontSize: 9,
        color: "#FFFFFF",
        opacity: 0.6,
        zIndex: 10,
      },

      {
        type: "QR",
        id: "qr",
        x: 255,
        y: 125,
        width: 48,
        height: 48,
        value: "{{passQrValue}}",
        zIndex: 20,
      },

      {
        type: "BARCODE",
        id: "barcode",
        x: 20,
        y: 174,
        width: 185,
        height: 18,
        value: "{{memberId}}",
        format: "CODE128",
        zIndex: 20,
      },
    ],
  },

  // ============================================================
  // EVENT CARD
  // ============================================================

  EVENT_CARD: {
    width: 320,
    height: 200,
    borderRadius: 20,

    background: {
      type: "gradient",
      colors: ["#3B0764", "#701A75"],
      angle: 135,
    },

    elements: [
      {
        type: "IMAGE",
        id: "event-image",
        x: 185,
        y: 0,
        width: 135,
        height: 200,
        assetKey: "event-decoration",
        opacity: 0.35,
        zIndex: 1,
      },

      {
        type: "LOGO",
        id: "logo",
        x: 20,
        y: 18,
        width: 40,
        height: 40,
        assetKey: "logo",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "event-label",
        x: 70,
        y: 21,
        width: 100,
        height: 16,
        text: "EVENT PASS",
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 1.4,
        color: "#FFFFFF",
        opacity: 0.6,
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "event-name",
        x: 20,
        y: 72,
        width: 175,
        height: 48,
        text: "{{eventName}}",
        fontSize: 21,
        fontWeight: 800,
        lineHeight: 1.1,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "event-date",
        x: 20,
        y: 128,
        width: 160,
        height: 20,
        text: "{{eventDate}}",
        fontSize: 11,
        fontWeight: 600,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "event-time",
        x: 20,
        y: 149,
        width: 160,
        height: 18,
        text: "{{eventTime}}",
        fontSize: 10,
        color: "#FFFFFF",
        opacity: 0.7,
        zIndex: 10,
      },

      {
        type: "QR",
        id: "ticket-qr",
        x: 247,
        y: 115,
        width: 58,
        height: 58,
        value: "{{ticketQrValue}}",
        zIndex: 20,
      },

      {
        type: "TEXT",
        id: "ticket-id",
        x: 210,
        y: 177,
        width: 100,
        height: 12,
        text: "{{ticketId}}",
        fontSize: 7,
        align: "right",
        color: "#FFFFFF",
        opacity: 0.5,
        zIndex: 20,
      },
    ],
  },

  // ============================================================
  // MEMBERSHIP CARD
  // ============================================================

  MEMBERSHIP_CARD: {
    width: 320,
    height: 200,
    borderRadius: 20,

    background: {
      type: "gradient",
      colors: ["#18181B", "#3F3F46"],
      angle: 135,
    },

    elements: [
      {
        type: "IMAGE",
        id: "membership-texture",
        x: 0,
        y: 0,
        width: 320,
        height: 200,
        assetKey: "membership-texture",
        opacity: 0.16,
        zIndex: 1,
      },

      {
        type: "LOGO",
        id: "logo",
        x: 20,
        y: 18,
        width: 42,
        height: 42,
        assetKey: "logo",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "brand",
        x: 72,
        y: 20,
        width: 160,
        height: 20,
        text: "{{brandName}}",
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "membership-label",
        x: 20,
        y: 78,
        width: 130,
        height: 16,
        text: "MEMBERSHIP",
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: 1.5,
        color: "#FFFFFF",
        opacity: 0.5,
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "tier",
        x: 20,
        y: 97,
        width: 190,
        height: 32,
        text: "{{membershipTier}}",
        fontSize: 25,
        fontWeight: 800,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "member-name",
        x: 20,
        y: 134,
        width: 190,
        height: 22,
        text: "{{customerName}}",
        fontSize: 11,
        fontWeight: 600,
        color: "#FFFFFF",
        opacity: 0.8,
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "expiry",
        x: 20,
        y: 158,
        width: 170,
        height: 18,
        text: "Valid until {{expiryDate}}",
        fontSize: 8,
        color: "#FFFFFF",
        opacity: 0.5,
        zIndex: 10,
      },

      {
        type: "QR",
        id: "qr",
        x: 255,
        y: 125,
        width: 48,
        height: 48,
        value: "{{passQrValue}}",
        zIndex: 20,
      },

      {
        type: "BARCODE",
        id: "barcode",
        x: 20,
        y: 177,
        width: 180,
        height: 15,
        value: "{{memberId}}",
        format: "CODE128",
        zIndex: 20,
      },
    ],
  },

  // ============================================================
  // STAFF CARD
  // ============================================================

  STAFF_CARD: {
    width: 320,
    height: 200,
    borderRadius: 20,

    background: {
      type: "gradient",
      colors: ["#0F172A", "#334155"],
      angle: 135,
    },

    elements: [
      {
        type: "IMAGE",
        id: "staff-pattern",
        x: 175,
        y: 0,
        width: 145,
        height: 200,
        assetKey: "staff-decoration",
        opacity: 0.15,
        zIndex: 1,
      },

      {
        type: "LOGO",
        id: "logo",
        x: 20,
        y: 18,
        width: 42,
        height: 42,
        assetKey: "logo",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "brand",
        x: 72,
        y: 20,
        width: 160,
        height: 20,
        text: "{{brandName}}",
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "staff-label",
        x: 20,
        y: 78,
        width: 140,
        height: 16,
        text: "STAFF ACCESS",
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: 1.4,
        color: "#FFFFFF",
        opacity: 0.55,
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "employee-name",
        x: 20,
        y: 98,
        width: 220,
        height: 30,
        text: "{{employeeName}}",
        fontSize: 21,
        fontWeight: 800,
        color: "#FFFFFF",
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "employee-id",
        x: 20,
        y: 132,
        width: 160,
        height: 18,
        text: "ID {{employeeId}}",
        fontSize: 9,
        fontWeight: 600,
        color: "#FFFFFF",
        opacity: 0.65,
        zIndex: 10,
      },

      {
        type: "TEXT",
        id: "branch",
        x: 20,
        y: 151,
        width: 180,
        height: 18,
        text: "{{branchName}}",
        fontSize: 9,
        color: "#FFFFFF",
        opacity: 0.55,
        zIndex: 10,
      },

      {
        type: "QR",
        id: "staff-qr",
        x: 255,
        y: 120,
        width: 50,
        height: 50,
        value: "{{staffQrValue}}",
        zIndex: 20,
      },

      {
        type: "BARCODE",
        id: "employee-barcode",
        x: 20,
        y: 177,
        width: 180,
        height: 15,
        value: "{{employeeId}}",
        format: "CODE128",
        zIndex: 20,
      },
    ],
  },
} as const satisfies Record<ProgramCardId, ProgramCardDesign>;

export const PROGRAM_CARD_TYPES = [
  {
    id: "STAMP_CARD",

    tr: {
      title: "Damga kartı",
      headline: "Her ziyaret, ödüle bir adım.",
      tagline: "Her ziyarette damga — klasik sadakat kartı.",
      howItWorks:
        "Müşteri kasada QR veya NFC okutarak her ziyarette bir damga kazanır. Belirlediğiniz hedefe (ör. 10 damga) ulaşıldığında ödül otomatik tanımlanır; pass Apple Wallet ve Google Wallet’ta anında güncellenir.",
      useCases: ["Kafe & restoran", "Berber & kuaför", "Fırın & pastane"],
    },

    en: {
      title: "Stamp card",
      headline: "Every visit, one step closer.",
      tagline: "One stamp per visit — the classic loyalty card.",
      howItWorks:
        "Guests earn one stamp per visit via QR or NFC at the counter. When they hit your target (e.g. 10 stamps), the reward unlocks automatically and the pass updates in Apple Wallet and Google Wallet.",
      useCases: ["Cafés & restaurants", "Salons & barbers", "Bakeries & patisseries"],
    },

    ru: {
      title: "Карточка с печатями",
      headline: "Каждый визит приближает к награде.",
      tagline: "Одна печать за каждый визит — классическая программа лояльности.",
      howItWorks:
        "Клиент получает одну печать за каждый визит, отсканировав QR-код или воспользовавшись NFC на кассе. После достижения установленной цели (например, 10 печатей) награда автоматически становится доступной, а карта обновляется в Apple Wallet и Google Wallet.",
      useCases: ["Кафе и рестораны", "Салоны и барбершопы", "Пекарни и кондитерские"],
    },
  },

  {
    id: "MULTI_STAMP",

    tr: {
      title: "Çoklu damga",
      headline: "Tek kart, birden fazla ödül hattı.",
      tagline: "Kahve, tatlı gibi farklı ürün grupları.",
      howItWorks:
        "Tek kartta birden fazla ürün grubu için ayrı sayaç tutulur. Kahve 6, tatlı 4 gibi farklı hedefler tanımlayabilir; her grup kendi ödülüne ulaştığında müşteriye bildirim gider.",
      useCases: ["Kahve zincirleri", "Fast casual", "Karma menülü restoranlar"],
    },

    en: {
      title: "Multi-stamp",
      headline: "One pass, multiple reward tracks.",
      tagline: "Different product groups — coffee, dessert, and more.",
      howItWorks:
        "Run separate counters on one pass — coffee 6, dessert 4, and so on. Each group has its own reward threshold; guests get notified when any line completes.",
      useCases: ["Coffee chains", "Fast casual", "Mixed-menu restaurants"],
    },

    ru: {
      title: "Мульти-печать",
      headline: "Одна карта — несколько линий наград.",
      tagline: "Отдельные программы для кофе, десертов и других категорий.",
      howItWorks:
        "На одной карте можно вести отдельные счётчики для разных категорий товаров. Например, установить цель в 6 покупок кофе и 4 покупки десерта. Для каждой категории действует собственная награда, а клиент получает уведомление после достижения соответствующей цели.",
      useCases: ["Кофейные сети", "Рестораны fast casual", "Рестораны со смешанным меню"],
    },
  },

  {
    id: "POINT_CARD",

    tr: {
      title: "Puan kartı",
      headline: "Harcanabilir puan, anında hesaplanır.",
      tagline: "Harcanabilir puan biriktirme.",
      howItWorks:
        "Her harcama tutarına göre puan kazanılır. Kasada tutar girildiğinde puan otomatik hesaplanır; müşteri biriken puanı indirim veya ücretsiz ürün için harcayabilir.",
      useCases: ["Market & süpermarket", "Perakende", "E-ticaret mağazaları"],
    },

    en: {
      title: "Point card",
      headline: "Redeemable points, calculated instantly.",
      tagline: "Earn redeemable points from purchases.",
      howItWorks:
        "Points accrue from each purchase amount. Staff enter the total at checkout; guests redeem accumulated points for discounts or free items whenever they choose.",
      useCases: ["Grocery & retail", "Boutiques", "Omni-channel stores"],
    },

    ru: {
      title: "Бонусная карта",
      headline: "Баллы начисляются и сразу готовы к использованию.",
      tagline: "Накапливайте бонусные баллы за покупки.",
      howItWorks:
        "За каждую покупку клиент получает бонусные баллы в зависимости от суммы заказа. Сотрудник вводит сумму покупки на кассе, после чего баллы начисляются автоматически. Накопленные баллы можно использовать для получения скидок или бесплатных товаров.",
      useCases: ["Супермаркеты и магазины", "Розничная торговля", "Интернет-магазины"],
    },
  },

  {
    id: "CASHBACK_CARD",

    tr: {
      title: "Cashback kartı",
      headline: "Harcama, mağaza kredisine dönüşür.",
      tagline: "Harcama tutarına göre mağaza kredisi.",
      howItWorks:
        "Harcama tutarının belirlediğiniz yüzdesi mağaza kredisi olarak bakiyeye eklenir. Müşteri bir sonraki alışverişte krediyi kasada kullanır; bakiye pass üzerinde görünür.",
      useCases: ["Giyim & moda", "Elektronik", "Premium perakende"],
    },

    en: {
      title: "Cashback card",
      headline: "Spend that pays guests back.",
      tagline: "Store credit as a percentage of spend.",
      howItWorks:
        "A percentage of each purchase is added as store credit. Guests spend the balance on their next visit; the running total is always visible on the wallet pass.",
      useCases: ["Fashion & apparel", "Electronics", "Premium retail"],
    },

    ru: {
      title: "Карта с кешбэком",
      headline: "Каждая покупка превращается в бонусный баланс.",
      tagline: "Бонус на баланс в зависимости от суммы покупки.",
      howItWorks:
        "Определённый процент от каждой покупки автоматически начисляется на баланс клиента в виде бонуса. Клиент может использовать накопленный баланс при следующей покупке, а текущая сумма всегда отображается на карте в кошельке.",
      useCases: ["Одежда и мода", "Электроника", "Премиальный ритейл"],
    },
  },

  {
    id: "DISCOUNT_CARD",

    tr: {
      title: "İndirim kartı",
      headline: "İndirim, kasada tek QR ile doğrulanır.",
      tagline: "Yüzde veya sabit indirim — QR ile doğrulama.",
      howItWorks:
        "Yüzde veya sabit tutar indirim tanımlarsınız. Kasada QR okutularak indirim doğrulanır; tek kullanımlık, süreli veya segment bazlı kampanyalara uygundur.",
      useCases: ["Sezon kampanyaları", "Öğrenci indirimleri", "VIP müşteriler"],
    },

    en: {
      title: "Discount card",
      headline: "Discounts verified in one scan.",
      tagline: "Percent or fixed discount — QR verified.",
      howItWorks:
        "Set a percentage or fixed discount on the pass. Staff scan the QR at checkout to verify eligibility — ideal for one-time promos, time-bound offers, or VIP segments.",
      useCases: ["Seasonal campaigns", "Student offers", "VIP guests"],
    },

    ru: {
      title: "Дисконтная карта",
      headline: "Скидка подтверждается одним сканированием.",
      tagline: "Процентная или фиксированная скидка с подтверждением по QR.",
      howItWorks:
        "Вы устанавливаете процентную или фиксированную скидку для клиента. На кассе сотрудник сканирует QR-код и подтверждает право на скидку. Карта подходит для разовых акций, предложений с ограниченным сроком действия и специальных условий для VIP-клиентов.",
      useCases: ["Сезонные акции", "Скидки для студентов", "VIP-клиенты"],
    },
  },

  {
    id: "EVENT_CARD",

    tr: {
      title: "Etkinlik kartı",
      headline: "Bilet cüzdanda, giriş tek QR ile.",
      tagline: "Tadım günü, workshop dijital bileti.",
      howItWorks:
        "Etkinlik bileti dijital pass olarak cüzdana eklenir. Girişte QR ile doğrulama yapılır; tarih, saat, kontenjan ve etkinlik adı pass üzerinde net görünür.",
      useCases: ["Tadım günleri", "Workshop & seminer", "Pop-up etkinlikler"],
    },

    en: {
      title: "Event card",
      headline: "Tickets in wallet, entry in one scan.",
      tagline: "Digital ticket for tastings and workshops.",
      howItWorks:
        "Issue a digital ticket straight to the guest wallet. Scan QR at entry to validate; date, time, capacity, and event name stay visible on the pass.",
      useCases: ["Tasting days", "Workshops & seminars", "Pop-up events"],
    },

    ru: {
      title: "Карта мероприятия",
      headline: "Билет в кошельке, вход по одному QR.",
      tagline: "Цифровой билет для дегустаций, воркшопов и мероприятий.",
      howItWorks:
        "Цифровой билет добавляется прямо в кошелёк клиента. При входе QR-код сканируется для проверки билета. Дата, время, количество доступных мест и название мероприятия всегда отображаются на карте.",
      useCases: ["Дегустации", "Воркшопы и семинары", "Pop-up мероприятия"],
    },
  },

  {
    id: "MEMBERSHIP_CARD",

    tr: {
      title: "Üyelik kartı",
      headline: "Üyelik hakları otomatik yenilenir.",
      tagline: "Abonelik ve periyodik haklar.",
      howItWorks:
        "Ücretli veya ücretsiz üyelik tanımlarsınız. Periyodik haklar (aylık ücretsiz içecek vb.) otomatik yenilenir; geçerlilik tarihi ve tier bilgisi pass’te takip edilir.",
      useCases: ["Spor salonları", "Coworking", "Abonelik tabanlı işletmeler"],
    },

    en: {
      title: "Membership card",
      headline: "Membership perks that renew themselves.",
      tagline: "Subscription with recurring benefits.",
      howItWorks:
        "Offer paid or free membership tiers. Recurring perks (monthly free drinks, etc.) renew on schedule; validity and tier status stay on the pass.",
      useCases: ["Gyms & studios", "Coworking spaces", "Subscription businesses"],
    },

    ru: {
      title: "Карта участника",
      headline: "Преимущества участника обновляются автоматически.",
      tagline: "Подписка с регулярными бонусами и привилегиями.",
      howItWorks:
        "Предлагайте платные или бесплатные уровни членства. Регулярные привилегии, например бесплатный напиток каждый месяц, автоматически обновляются по расписанию. Срок действия и уровень участника всегда отображаются на карте.",
      useCases: ["Фитнес-клубы и студии", "Коворкинги", "Бизнесы с подпиской"],
    },
  },

  {
    id: "STAFF_CARD",

    tr: {
      title: "Personel kartı",
      headline: "Personel yan hakları, ayrı pass.",
      tagline: "Çalışan yan hakları — müşteri programından ayrı.",
      howItWorks:
        "Çalışanlara özel yan hak kartı; müşteri programlarından tamamen izole. Günlük veya aylık personel indirimi, şube bazlı yetkilendirme ve ID doğrulama tek pass’te.",
      useCases: ["Restoran zincirleri", "Perakende ekipleri", "Çok şubeli işletmeler"],
    },

    en: {
      title: "Staff card",
      headline: "Staff perks on a separate pass.",
      tagline: "Employee perks — isolated from guest programs.",
      howItWorks:
        "A separate pass for staff benefits, fully isolated from guest loyalty. Daily or monthly discounts, branch-level access, and employee ID verification on one card.",
      useCases: ["Restaurant chains", "Retail teams", "Multi-branch operators"],
    },

    ru: {
      title: "Карта сотрудника",
      headline: "Привилегии сотрудников — на отдельной карте.",
      tagline: "Преимущества для сотрудников — отдельно от клиентской программы.",
      howItWorks:
        "Создайте отдельную цифровую карту для сотрудников, полностью изолированную от клиентской программы лояльности. На одной карте можно управлять ежедневными или ежемесячными скидками, доступом на уровне филиалов и проверкой ID сотрудника.",
      useCases: ["Ресторанные сети", "Розничные команды", "Многосетевые компании"],
    },
  },
] as const;

export type ProgramCardId = (typeof PROGRAM_CARD_TYPES)[number]["id"];

export type ProgramCardLocale = "tr" | "en" | "ru";

export type ProgramCardCopy = {
  id: ProgramCardId;
  title: string;
  headline: string;
  tagline: string;
  howItWorks: string;
  useCases: readonly string[];
};

export function getProgramCardTypes(
  locale: string,
): ProgramCardCopy[] {
  const normalizedLocale: ProgramCardLocale =
    locale === "tr" || locale === "ru" ? locale : "en";

  return PROGRAM_CARD_TYPES.map((item) => {
    const copy = item[normalizedLocale];

    return {
      id: item.id,
      title: copy.title,
      headline: copy.headline,
      tagline: copy.tagline,
      howItWorks: copy.howItWorks,
      useCases: copy.useCases,
    };
  });
}