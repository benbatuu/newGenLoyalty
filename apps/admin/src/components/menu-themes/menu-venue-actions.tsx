"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  MenuBottomNavId,
  MenuBottomNavItem,
  MenuExploreCard,
  MenuExplorePage,
  MenuFeedbackForm,
  MenuLang,
} from "@ngl/shared";
import { defaultFeedbackForm, pickMenuLocale } from "@ngl/shared";
import type { MenuItemData } from "./menu-theme-types";
import { t } from "./menu-i18n";

export type CartLine = {
  key: string;
  item: MenuItemData;
  variantName?: string;
  unitPrice: number;
  qty: number;
};

type Sheet =
  | { type: "none" }
  | { type: "product"; item: MenuItemData }
  | { type: "cart" }
  | { type: "suggest" }
  | { type: "complaint" }
  | { type: "wifi" }
  | { type: "waiter" }
  | { type: "explore" };

export function useMenuInteractions(opts: {
  languages: MenuLang[];
  defaultLanguage: MenuLang;
  productClick: "detail" | "cart" | "none";
  allowAddToCart: boolean;
}) {
  const [lang, setLang] = useState<MenuLang>(opts.defaultLanguage);
  const [sheet, setSheet] = useState<Sheet>({ type: "none" });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!opts.languages.includes(lang)) setLang(opts.defaultLanguage);
  }, [opts.defaultLanguage, opts.languages, lang]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const cartCount = useMemo(() => cart.reduce((n, l) => n + l.qty, 0), [cart]);

  function addToCart(item: MenuItemData, variantName?: string, unitPrice?: number) {
    const price = unitPrice ?? (Number(item.price) || 0);
    const key = `${item.id}:${variantName ?? ""}`;
    setCart((prev) => {
      const hit = prev.find((l) => l.key === key);
      if (hit) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { key, item, variantName, unitPrice: price, qty: 1 }];
    });
    setToast(t(lang, "added"));
  }

  function openNav(id: MenuBottomNavId) {
    if (id === "explore") {
      setSheet({ type: "explore" });
      return;
    }
    if (id === "cart") setSheet({ type: "cart" });
    else if (id === "suggest") setSheet({ type: "suggest" });
    else if (id === "complaint") setSheet({ type: "complaint" });
    else if (id === "wifi") setSheet({ type: "wifi" });
    else if (id === "waiter") setSheet({ type: "waiter" });
  }

  function onProductClick(item: MenuItemData) {
    if (opts.productClick === "none") return;
    if (opts.productClick === "cart" && opts.allowAddToCart) {
      addToCart(item);
      return;
    }
    setSheet({ type: "product", item });
  }

  return {
    lang,
    setLang,
    sheet,
    setSheet,
    cart,
    setCart,
    cartCount,
    toast,
    setToast,
    addToCart,
    openNav,
    onProductClick,
  };
}

const SHEET_MS = 340;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function useSheetPresence(open: boolean) {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setEntered(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setEntered(false);
    const wait = reduced ? 0 : SHEET_MS;
    const t = window.setTimeout(() => setMounted(false), wait);
    return () => window.clearTimeout(t);
  }, [open, reduced]);

  return { mounted, entered, reduced };
}

function NavGlyph({ id }: { id: MenuBottomNavId }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (id === "cart") {
    return (
      <svg {...common}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  }
  if (id === "suggest") {
    return (
      <svg {...common}>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    );
  }
  if (id === "complaint") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    );
  }
  if (id === "wifi") {
    return (
      <svg {...common}>
        <path d="M12 20h.01" />
        <path d="M2 8.82a15 15 0 0 1 20 0" />
        <path d="M5 12.86a10 10 0 0 1 14 0" />
        <path d="M8.5 16.43a5 5 0 0 1 7 0" />
      </svg>
    );
  }
  if (id === "waiter") {
    return (
      <svg {...common}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function MenuBottomNav({
  items,
  lang,
  uiLabels,
  cartCount,
  onOpen,
  accent,
  barBg,
  muted,
  contained,
}: {
  items: MenuBottomNavItem[];
  lang: MenuLang;
  uiLabels?: import("./menu-i18n").MenuUiLabels;
  cartCount: number;
  onOpen: (id: MenuBottomNavId) => void;
  accent: string;
  barBg: string;
  muted: string;
  contained?: boolean;
}) {
  const enabled = items.filter((i) => i.enabled);
  if (!enabled.length) return null;

  return (
    <nav
      className="z-40 border-t backdrop-blur-xl"
      style={{
        position: contained ? "absolute" : "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        borderColor: "rgba(255,255,255,0.1)",
        background: barBg,
        color: muted,
        paddingBottom: contained
          ? 8
          : "max(8px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-stretch justify-around px-1 pt-1.5">
        {enabled.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.id)}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[9px] uppercase tracking-[0.1em] [touch-action:manipulation]"
            style={{ color: muted }}
          >
            <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
              <NavGlyph id={item.id} />
            </span>
            <span className="truncate">
              {pickMenuLocale(
                typeof item.label === "string" ? { tr: item.label } : item.label,
                lang,
                t(lang, item.id, uiLabels),
              )}
            </span>
            {item.id === "cart" && cartCount > 0 ? (
              <span
                className="absolute right-[12%] top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-semibold"
                style={{ background: accent, color: barBg }}
              >
                {cartCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** Çekmeceyi aşağı sürükleyerek kapatma. Sayfa en üstteyken ve aşağı çekilirken devreye girer. */
function useSheetDrag(enabled: boolean, onClose: () => void) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ y0: number; t0: number; active: boolean; pointerId: number } | null>(null);
  const dragYRef = useRef(0);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!enabled || e.button !== 0) return;
    gesture.current = { y0: e.clientY, t0: performance.now(), active: false, pointerId: e.pointerId };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dy = e.clientY - g.y0;
    if (!g.active) {
      // Yalnızca aşağı yönlü hareket ve içerik en üstteyken sürüklemeyi başlat
      if (dy > 8 && e.currentTarget.scrollTop <= 0) {
        g.active = true;
        setDragging(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } else if (dy < -8) {
        gesture.current = null;
        return;
      } else {
        return;
      }
    }
    const next = Math.max(0, dy);
    dragYRef.current = next;
    setDragY(next);
  }
  function finish(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || !g.active) return;
    const dist = dragYRef.current;
    const v = dist / Math.max(1, performance.now() - g.t0);
    setDragging(false);
    dragYRef.current = 0;
    setDragY(0);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (dist > 110 || (dist > 30 && v > 0.45)) onClose();
  }
  return {
    dragY,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}

export function MenuSheet({
  open,
  onClose,
  title,
  children,
  ink,
  panel,
  muted,
  contained,
  variant = "drawer",
  showTitle = true,
  closeLabel = "Kapat",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  ink: string;
  panel: string;
  muted: string;
  contained?: boolean;
  variant?: "sheet" | "drawer";
  showTitle?: boolean;
  closeLabel?: string;
}) {
  const drawer = variant !== "sheet";
  const { mounted, entered, reduced } = useSheetPresence(open);
  const held = useRef(children);
  if (open) held.current = children;
  const drag = useSheetDrag(Boolean(drawer), onClose);
  if (!mounted) return null;

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  const motion = reduced ? "none" : `transform ${SHEET_MS}ms ${ease}`;
  const fade = reduced ? "none" : `opacity ${SHEET_MS}ms ${ease}`;
  const body = held.current;

  return (
    <div
      className="z-[60] flex items-end justify-center [touch-action:manipulation]"
      style={{
        position: contained ? "absolute" : "fixed",
        inset: 0,
        pointerEvents: entered ? "auto" : "none",
      }}
    >
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0"
        onClick={onClose}
        style={{
          background: "rgba(0,0,0,0.5)",
          opacity: entered ? 1 : 0,
          transition: fade,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        className={`relative z-[61] w-full overflow-auto border-0 shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.45)] ${
          drawer
            ? "max-h-[92%] rounded-t-[28px] px-5 pb-0 pt-3 sm:max-w-xl"
            : "max-h-[85%] rounded-t-2xl p-4 sm:max-w-md sm:rounded-2xl"
        }`}
        {...(drawer ? drag.handlers : {})}
        style={{
          background: panel,
          color: ink,
          borderColor: `${ink}14`,
          paddingBottom: drawer
            ? "max(24px, env(safe-area-inset-bottom))"
            : undefined,
          touchAction: drawer ? "pan-x pan-y" : undefined,
          transform: entered
            ? `translate3d(0,${drag.dragY}px,0)`
            : "translate3d(0,100%,0)",
          transition: drag.dragging ? "none" : motion,
          willChange: reduced ? undefined : "transform",
        }}
      >
        <div className="relative mb-0 h-9">
          {drawer ? (
            <span
              aria-hidden
              className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full"
              style={{ background: `${ink}22` }}
            />
          ) : null}
          {showTitle && title ? (
            <h3
              className={`pr-12 text-base font-semibold ${drawer ? "pt-5 text-center" : "pt-2"}`}
            >
              {title}
            </h3>
          ) : drawer ? (
            <div className="h-2" />
          ) : null}
        </div>
        {title && drawer && !showTitle ? (
          <h3 className="sr-only">{title}</h3>
        ) : null}
        {body}
      </div>
    </div>
  );
}

export function exploreHref(card: MenuExploreCard): string {
  const h = card.href.trim();
  if (card.kind === "phone") {
    const n = h.replace(/[^\d+]/g, "");
    return n ? `tel:${n}` : "";
  }
  if (card.kind === "email") {
    const e = h.replace(/^mailto:/i, "");
    return e ? `mailto:${e}` : "";
  }
  if (card.kind === "whatsapp") {
    const n = h.replace(/\D/g, "");
    return n ? `https://wa.me/${n}` : "";
  }
  if (card.kind === "instagram") {
    if (!h) return "";
    if (/^https?:\/\//i.test(h)) return h;
    const user = h
      .replace(/^@/, "")
      .replace(/.*instagram\.com\//i, "")
      .split(/[/?#]/)[0];
    return user ? `https://instagram.com/${user}` : "";
  }
  if (card.kind === "facebook") {
    if (!h) return "";
    if (/^https?:\/\//i.test(h)) return h;
    return `https://facebook.com/${h.replace(/^@/, "")}`;
  }
  if (card.kind === "maps") {
    if (!h) return "";
    if (/^https?:\/\//i.test(h)) return h;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h)}`;
  }
  if (!h) return "";
  return /^https?:\/\//i.test(h) ? h : `https://${h}`;
}

function Chevron() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ExplorePage({
  page,
  lang,
  displayFont,
  textColor,
  mutedColor,
  surfaceColor,
  radius,
}: {
  page: MenuExplorePage;
  lang: MenuLang;
  displayFont: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  radius: string;
}) {
  const eyebrow = pickMenuLocale(page.eyebrow, lang, t(lang, "explore"));
  const title = pickMenuLocale(page.title, lang, t(lang, "explore"));
  const description = pickMenuLocale(page.description, lang);
  const location = pickMenuLocale(page.location, lang);
  const hours = pickMenuLocale(page.hours, lang);
  const meta = [location, hours].filter(Boolean).join("  ·  ");

  return (
    <div>
      {eyebrow ? (
        <p
          className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em]"
          style={{ color: mutedColor }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        style={{
          fontFamily: displayFont,
          fontSize: 34,
          lineHeight: 1.1,
          fontWeight: 600,
          margin: "0 0 10px",
        }}
      >
        {title}
      </h2>
      {description ? (
        <p className="mb-2 text-sm leading-relaxed" style={{ color: mutedColor }}>
          {description}
        </p>
      ) : null}
      {meta ? (
        <p className="mb-6 text-xs" style={{ color: mutedColor }}>
          {meta}
        </p>
      ) : (
        <div className="mb-4" />
      )}
      {page.sections.map((section) => {
        const cards = section.cards.filter((c) => c.enabled);
        if (!cards.length) return null;
        const heading = pickMenuLocale(section.heading, lang);
        return (
          <section key={section.id} className="mb-6">
            {heading ? (
              <h3
                className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em]"
                style={{ color: mutedColor }}
              >
                {heading}
              </h3>
            ) : null}
            <div className="flex flex-col gap-2">
              {cards.map((card) => {
                const href = exploreHref(card);
                const name = pickMenuLocale(card.title, lang, card.kind);
                const sub = pickMenuLocale(card.subtitle, lang);
                const value = card.value.trim();
                const inner = (
                  <>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-semibold">{name}</span>
                      {sub ? (
                        <span className="mt-0.5 block text-xs" style={{ color: mutedColor }}>
                          {sub}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {value ? (
                        <span className="max-w-[9rem] truncate text-xs" style={{ color: mutedColor }}>
                          {value}
                        </span>
                      ) : null}
                      <span style={{ color: mutedColor }}>
                        <Chevron />
                      </span>
                    </span>
                  </>
                );
                const className =
                  "flex min-h-14 w-full items-center gap-3 border px-4 py-3";
                const style = {
                  background: surfaceColor,
                  borderColor: `${textColor}14`,
                  color: textColor,
                  borderRadius: radius,
                };
                if (!href) {
                  return (
                    <div key={card.id} className={className} style={style}>
                      {inner}
                    </div>
                  );
                }
                return (
                  <a
                    key={card.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                    style={style}
                  >
                    {inner}
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CopyGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function WifiCredentials({
  ssid,
  password,
  lang,
  uiLabels,
  ink,
  muted,
  accent,
}: {
  ssid: string;
  password: string;
  lang: MenuLang;
  uiLabels?: import("./menu-i18n").MenuUiLabels;
  ink: string;
  muted: string;
  accent: string;
}) {
  const [copied, setCopied] = useState<"ssid" | "password" | null>(null);

  async function copy(kind: "ssid" | "password", value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  }

  function Row({
    label,
    value,
    kind,
  }: {
    label: string;
    value: string;
    kind: "ssid" | "password";
  }) {
    const display = value || "—";
    return (
      <div
        className="flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2"
        style={{ borderColor: `${ink}14` }}
      >
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: muted }}>
            {label}
          </p>
          <p className="truncate text-sm font-medium">{display}</p>
        </div>
        {value ? (
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{
              color: copied === kind ? accent : muted,
              background: `${ink}08`,
            }}
            aria-label={t(lang, "copy", uiLabels)}
            onClick={() => void copy(kind, value)}
          >
            <CopyGlyph />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-1 text-sm" style={{ color: muted }}>
        {t(lang, "wifiHint", uiLabels)}
      </p>
      <Row label="SSID" value={ssid} kind="ssid" />
      <Row label="Password" value={password} kind="password" />
      {copied ? (
        <p className="text-xs" style={{ color: accent }}>
          {t(lang, "copied", uiLabels)}
        </p>
      ) : null}
    </div>
  );
}

export function FeedbackForm({
  lang,
  uiLabels,
  accent,
  ink,
  muted,
  onDone,
  slug,
  kind,
  tableLabel,
  form,
}: {
  lang: MenuLang;
  uiLabels?: import("./menu-i18n").MenuUiLabels;
  accent: string;
  ink: string;
  muted: string;
  onDone: () => void;
  slug?: string;
  kind?: "suggest" | "complaint";
  tableLabel?: string;
  form?: MenuFeedbackForm;
}) {
  const base = defaultFeedbackForm(kind ?? "suggest");
  const resolved: MenuFeedbackForm = {
    fields: form?.fields?.length ? form.fields : base.fields,
    submitLabel: form?.submitLabel ?? base.submitLabel,
    thanksMessage: form?.thanksMessage ?? base.thanksMessage,
  };
  const fields = resolved.fields;
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (sent) {
    return (
      <p style={{ color: muted }}>
        {pickMenuLocale(resolved.thanksMessage, lang, t(lang, "thanks", uiLabels))}
      </p>
    );
  }

  function setValue(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        const nameField = fields.find((f) => f.role === "name");
        const messageField = fields.find((f) => f.role === "message");
        const name = nameField ? (values[nameField.id] ?? "").trim() : "";
        const message = messageField
          ? (values[messageField.id] ?? "").trim()
          : "";
        if (messageField?.required !== false && !message) return;
        for (const f of fields) {
          if (f.required && !(values[f.id] ?? "").trim()) return;
        }

        const extras: { label: string; value: string }[] = [];
        for (const f of fields) {
          if (f.role === "name" || f.role === "message") continue;
          const v = (values[f.id] ?? "").trim();
          if (!v) continue;
          extras.push({
            label: pickMenuLocale(f.label, lang, f.type) || f.type,
            value: v,
          });
        }

        setBusy(true);
        setErr(null);
        const body = {
          type: kind ?? "suggest",
          name: name || undefined,
          message,
          extras,
          lang,
          tableLabel: tableLabel || undefined,
        };
        const run = async () => {
          if (slug) {
            const res = await fetch(
              `/backend/public/menu/${encodeURIComponent(slug)}/feedback`,
              {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  accept: "application/json",
                },
                body: JSON.stringify(body),
              },
            );
            if (!res.ok) throw new Error("fail");
          }
          setSent(true);
          window.setTimeout(onDone, 2000);
        };
        void run()
          .catch(() => setErr("…"))
          .finally(() => setBusy(false));
      }}
    >
      {fields.map((field) => {
        const label = pickMenuLocale(field.label, lang);
        const placeholder =
          pickMenuLocale(field.placeholder, lang) || label || undefined;
        const value = values[field.id] ?? "";
        const fieldStyle = { borderColor: `${ink}22`, color: ink };
        return (
          <div key={field.id} className="space-y-1">
            {label ? (
              <label
                className="block text-[11px] uppercase tracking-[0.12em]"
                style={{ color: muted }}
              >
                {label}
                {field.required ? " *" : ""}
              </label>
            ) : null}
            {field.type === "textarea" ? (
              <textarea
                rows={3}
                className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-base"
                style={fieldStyle}
                required={field.required}
                value={value}
                placeholder={placeholder}
                aria-label={label || field.role}
                onChange={(e) => setValue(field.id, e.target.value)}
              />
            ) : field.type === "select" ? (
              <select
                className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-base"
                style={fieldStyle}
                required={field.required}
                value={value}
                aria-label={label || field.role}
                onChange={(e) => setValue(field.id, e.target.value)}
              >
                <option value="">{placeholder || "—"}</option>
                {field.options.map((opt) => {
                  const optLabel = pickMenuLocale(opt.label, lang);
                  return (
                    <option key={opt.id} value={optLabel}>
                      {optLabel}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type={
                  field.type === "email"
                    ? "email"
                    : field.type === "tel"
                      ? "tel"
                      : "text"
                }
                className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-base"
                style={fieldStyle}
                required={field.required}
                value={value}
                placeholder={placeholder}
                aria-label={label || field.role}
                onChange={(e) => setValue(field.id, e.target.value)}
              />
            )}
          </div>
        );
      })}
      {err ? (
        <p className="text-xs" style={{ color: muted }}>
          {t(lang, "sendFailed", uiLabels)}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 w-full rounded-full px-4 py-2.5 text-base font-semibold disabled:opacity-60 [touch-action:manipulation]"
        style={{ background: accent, color: ink }}
      >
        {pickMenuLocale(resolved.submitLabel, lang, t(lang, "send", uiLabels))}
      </button>
    </form>
  );
}
