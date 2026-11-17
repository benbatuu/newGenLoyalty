"use client";

import { cn } from "@/lib/utils";
import type { ProgramCardId } from "@/lib/program-types";

const ORG = "GreenLeaf Café";

/**
 * Mirrors the anatomy of a real Apple Wallet store-card pass:
 *   logo + logo text ......... header field (top right)
 *   strip with the primary field (big value) or the stamp row
 *   secondary fields (label above value, last one right-aligned)
 *   barcode in a white plate, with its alt text underneath
 * Flat brand colour, no gloss: real passes have a single background colour.
 */

type Field = { label: string; value: string };

type PassSpec = {
  /** backgroundColor in pass.json terms */
  bg: string;
  /** strip band, a darker tone of bg */
  strip: string;
  /** dark text for light passes */
  dark?: boolean;
  header: Field;
  primary?: Field;
  stamps?: { label: string; filled: number; total: number }[];
  fields: [Field, Field];
  serial: string;
};

function getSpec(type: ProgramCardId, isTr: boolean): PassSpec {
  const member: Field = { label: isTr ? "Üye" : "Member", value: "Ayşe K." };

  switch (type) {
    case "STAMP_CARD":
      return {
        bg: "#1E4D3A",
        strip: "#173C2D",
        header: { label: isTr ? "Damga" : "Stamps", value: "8 / 10" },
        stamps: [{ label: "", filled: 8, total: 10 }],
        fields: [member, { label: isTr ? "Ödül" : "Reward", value: isTr ? "Ücretsiz kahve" : "Free coffee" }],
        serial: "GL-0001-8842",
      };
    case "MULTI_STAMP":
      return {
        bg: "#0F4C5C",
        strip: "#0B3B48",
        header: { label: isTr ? "Sayaç" : "Counters", value: "2" },
        stamps: [
          { label: isTr ? "Kahve" : "Coffee", filled: 4, total: 6 },
          { label: isTr ? "Tatlı" : "Dessert", filled: 2, total: 4 },
        ],
        fields: [member, { label: isTr ? "Sıradaki ödül" : "Next reward", value: isTr ? "Kahve · 2 kaldı" : "Coffee · 2 left" }],
        serial: "GL-0002-3190",
      };
    case "POINT_CARD":
      return {
        bg: "#2B2D6E",
        strip: "#212357",
        header: { label: isTr ? "Puan" : "Points", value: "1.240" },
        primary: { label: isTr ? "Puan bakiyesi" : "Point balance", value: "1.240" },
        fields: [
          { label: isTr ? "Son kazanım" : "Last earn", value: "+45" },
          { label: isTr ? "Kullanılabilir" : "Redeemable", value: "₺62" },
        ],
        serial: "GL-0003-5527",
      };
    case "CASHBACK_CARD":
      return {
        bg: "#14532D",
        strip: "#0F4223",
        header: { label: isTr ? "Bakiye" : "Balance", value: "₺48,50" },
        primary: { label: isTr ? "Kredi bakiyesi" : "Credit balance", value: "₺48,50" },
        fields: [
          { label: isTr ? "Son işlem" : "Last purchase", value: "₺120,00" },
          { label: isTr ? "Geri kazanım" : "Cashback", value: "+₺6,00" },
        ],
        serial: "GL-0004-7061",
      };
    case "DISCOUNT_CARD":
      return {
        bg: "#F2C14E",
        strip: "#E5B23C",
        dark: true,
        header: { label: isTr ? "İndirim" : "Discount", value: "%15" },
        primary: { label: isTr ? "Sıcak içeceklerde" : "On hot drinks", value: "%15" },
        fields: [member, { label: isTr ? "Geçerlilik" : "Valid for", value: isTr ? "30 gün" : "30 days" }],
        serial: "GL-0005-1408",
      };
    case "EVENT_CARD":
      return {
        bg: "#7A1F3D",
        strip: "#62182F",
        header: { label: isTr ? "Tarih" : "Date", value: "14 Mar" },
        primary: {
          label: isTr ? "Etkinlik" : "Event",
          value: isTr ? "Kahve Tadım Günü" : "Coffee Tasting Day",
        },
        fields: [
          { label: isTr ? "Saat" : "Time", value: "14:00" },
          { label: isTr ? "Giriş" : "Entry", value: isTr ? "1 kişi" : "1 guest" },
        ],
        serial: "GL-0006-9920",
      };
    case "MEMBERSHIP_CARD":
      return {
        bg: "#1C1C1E",
        strip: "#111112",
        header: { label: isTr ? "Seviye" : "Tier", value: "Gold" },
        primary: { label: isTr ? "Üyelik" : "Membership", value: "Gold" },
        fields: [
          { label: isTr ? "Geçerlilik" : "Valid until", value: isTr ? "Ara 2026" : "Dec 2026" },
          { label: isTr ? "Aylık hak" : "Monthly perk", value: isTr ? "2 ücretsiz" : "2 free" },
        ],
        serial: "GL-0007-2256",
      };
    case "STAFF_CARD":
      return {
        bg: "#3A4654",
        strip: "#2E3843",
        header: { label: "ID", value: "ST-1042" },
        primary: { label: isTr ? "Personel" : "Staff", value: "Ayşe Kaya" },
        fields: [
          { label: isTr ? "Şube" : "Branch", value: isTr ? "Kadıköy" : "Kadikoy" },
          { label: isTr ? "Durum" : "Status", value: isTr ? "Aktif" : "Active" },
        ],
        serial: "GL-0008-1042",
      };
  }
}

/* ---------- QR code (decorative, deterministic per serial) ---------- */

const QR_SIZE = 25;

function buildQr(seed: string): boolean[] {
  // Small string hash -> xorshift PRNG, so each pass gets a stable pattern
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };

  const n = QR_SIZE;
  const cells: boolean[] = new Array(n * n).fill(false);
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (inFinder(x, y)) continue;
      // timing patterns on row/col 6
      if (y === 6 || x === 6) {
        cells[y * n + x] = (x + y) % 2 === 0;
        continue;
      }
      cells[y * n + x] = rand() > 0.52;
    }
  }

  // Three finder patterns: 7x7 ring with a 3x3 core
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[(oy + y) * n + (ox + x)] = edge || core;
      }
    }
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);

  // Alignment pattern, bottom right
  const ax = n - 9;
  const ay = n - 9;
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const edge = x === 0 || x === 4 || y === 0 || y === 4;
      cells[(ay + y) * n + (ax + x)] = edge || (x === 2 && y === 2);
    }
  }
  return cells;
}

function PassQr({ seed, className }: { seed: string; className?: string }) {
  const cells = buildQr(seed);
  return (
    <svg
      viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {cells.map((on, i) =>
        on ? (
          <rect key={i} x={i % QR_SIZE} y={Math.floor(i / QR_SIZE)} width="1" height="1" fill="#000" />
        ) : null,
      )}
    </svg>
  );
}

/* ---------- Pieces ---------- */

function Logo({ dark }: { dark?: boolean }) {
  // Leaf mark for "GreenLeaf"
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
      <path
        d="M20 4c-8 0-14 4-14 11 0 1.2.2 2.3.6 3.3C8 13.5 11.500 10 16 8c-3.800 2.700-6.500 6.200-7.800 11.200C9.300 19.700 10.600 20 12 20c6 0 8-6 8-16z"
        fill={dark ? "rgba(0,0,0,0.8)" : "#fff"}
      />
    </svg>
  );
}

function FieldBlock({
  field,
  align = "left",
  dark,
  small,
}: {
  field: Field;
  align?: "left" | "right";
  dark?: boolean;
  small?: boolean;
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p
        className={cn(
          "truncate font-semibold uppercase tracking-[0.06em]",
          small ? "text-[0.5rem]" : "text-[0.56rem]",
          dark ? "text-black/55" : "text-white/60",
        )}
      >
        {field.label}
      </p>
      <p
        className={cn(
          "truncate leading-tight",
          small ? "text-[0.72rem]" : "text-[0.82rem]",
          dark ? "text-black/90" : "text-white",
        )}
      >
        {field.value}
      </p>
    </div>
  );
}

function StampRow({
  filled,
  total,
  dark,
  size,
}: {
  filled: number;
  total: number;
  dark?: boolean;
  size: "sm" | "md";
}) {
  return (
    <div className={cn("flex flex-wrap", size === "sm" ? "gap-1" : "gap-1.5")}>
      {Array.from({ length: total }).map((_, i) => {
        const on = i < filled;
        return (
          <span
            key={i}
            className={cn(
              "flex items-center justify-center rounded-full border",
              size === "sm" ? "size-[15px]" : "size-5",
              on
                ? dark
                  ? "border-black/80 bg-black/80"
                  : "border-white bg-white"
                : dark
                  ? "border-black/30"
                  : "border-white/40",
            )}
          >
            {on ? (
              <svg viewBox="0 0 12 12" className="size-[62%]" aria-hidden>
                <path
                  d="M2.500 6.300l2.300 2.300 4.700-5"
                  fill="none"
                  stroke={dark ? "#F2C14E" : "#111"}
                  strokeWidth="1.800"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export function AppleWalletPass({
  type,
  locale,
  className,
  compact = false,
}: {
  type: ProgramCardId;
  locale: string;
  className?: string;
  compact?: boolean;
}) {
  const isTr = locale === "tr";
  const spec = getSpec(type, isTr);
  const dark = spec.dark;

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full select-none flex-col overflow-hidden rounded-[14px] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_14px_30px_-12px_rgba(0,0,0,0.6)]",
        compact ? "h-[248px] max-w-[248px] sm:h-[280px]" : "min-h-[400px] max-w-[280px]",
        className,
      )}
      style={{ backgroundColor: spec.bg }}
    >
      {/* Logo row + header field */}
      <div className={cn("flex items-center justify-between gap-3", compact ? "px-3 pt-2.5" : "px-4 pt-3.5")}>
        <div className="flex min-w-0 items-center gap-1.5">
          <Logo dark={dark} />
          <p
            className={cn(
              "truncate font-medium",
              compact ? "text-[0.74rem]" : "text-[0.9rem]",
              dark ? "text-black/90" : "text-white",
            )}
          >
            {ORG}
          </p>
        </div>
        <FieldBlock field={spec.header} align="right" dark={dark} small={compact} />
      </div>

      {/* Strip: primary field or stamps */}
      <div
        className={cn(
          "flex flex-col justify-center",
          compact ? "mt-2 min-h-[58px] px-3 py-2" : "mt-3 min-h-[104px] px-4 py-3",
        )}
        style={{ backgroundColor: spec.strip }}
      >
        {spec.stamps ? (
          <div className={cn(compact ? "space-y-1.5" : "space-y-2.5")}>
            {spec.stamps.map((row) => (
              <div key={row.label || "stamps"}>
                {row.label ? (
                  <p
                    className={cn(
                      "mb-1 flex justify-between font-semibold uppercase tracking-[0.06em]",
                      compact ? "text-[0.5rem]" : "text-[0.56rem]",
                      dark ? "text-black/55" : "text-white/60",
                    )}
                  >
                    <span>{row.label}</span>
                    <span>
                      {row.filled} / {row.total}
                    </span>
                  </p>
                ) : null}
                <StampRow
                  filled={row.filled}
                  total={row.total}
                  dark={dark}
                  size={compact ? "sm" : "md"}
                />
              </div>
            ))}
          </div>
        ) : spec.primary ? (
          <div>
            <p
              className={cn(
                "truncate font-light leading-none tracking-tight",
                spec.primary.value.length > 10
                  ? compact
                    ? "text-[1.05rem]"
                    : "text-2xl"
                  : compact
                    ? "text-[1.7rem]"
                    : "text-[2.6rem]",
                dark ? "text-black/90" : "text-white",
              )}
            >
              {spec.primary.value}
            </p>
            <p
              className={cn(
                "mt-1 truncate font-semibold uppercase tracking-[0.06em]",
                compact ? "text-[0.5rem]" : "text-[0.56rem]",
                dark ? "text-black/55" : "text-white/60",
              )}
            >
              {spec.primary.label}
            </p>
          </div>
        ) : null}
      </div>

      {/* Secondary fields */}
      <div className={cn("flex justify-between gap-3", compact ? "px-3 pt-2" : "px-4 pt-3")}>
        <FieldBlock field={spec.fields[0]} dark={dark} small={compact} />
        <FieldBlock field={spec.fields[1]} align="right" dark={dark} small={compact} />
      </div>

      {/* Barcode plate */}
      <div className={cn("mt-auto flex justify-center", compact ? "pb-2.5 pt-2" : "pb-4 pt-4")}>
        <div className={cn("rounded-md bg-white", compact ? "p-1.5" : "p-2.5")}>
          <PassQr seed={spec.serial} className={compact ? "size-[58px] sm:size-[78px]" : "size-[104px]"} />
          <p
            className={cn(
              "text-center font-sans text-black/80",
              compact ? "mt-1 text-[0.42rem]" : "mt-1.5 text-[0.58rem]",
            )}
          >
            {spec.serial}
          </p>
        </div>
      </div>
    </div>
  );
}
