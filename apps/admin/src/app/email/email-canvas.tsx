"use client";

import { useEffect, useRef, useState } from "react";
import {
  blockStyleToReactCss,
  defaultsForBlockType,
  getBlockStyle,
  resolvePadding,
  type EmailBlock,
  type EmailDocument,
  resolveEmailTheme,
  sanitizeEmailHtml,
} from "@ngl/shared";
import { ApiError, apiUpload } from "../../lib/api";
import { resolveAdminAssetUrl } from "../../lib/public-urls";
import { btnGhost } from "../../components/ui";
import { mergeTheme } from "./email-block-utils";

type EmailCanvasProps = {
  document: EmailDocument;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (doc: EmailDocument) => void;
  disabled?: boolean;
};

function assetUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const resolved = resolveAdminAssetUrl(url);
  if (resolved.startsWith("http") || resolved.startsWith("data:")) return resolved;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${resolved.startsWith("/") ? resolved : `/${resolved}`}`;
  }
  return resolved;
}

export function EmailCanvas({
  document,
  selectedId,
  onSelect,
  onChange,
  disabled,
}: EmailCanvasProps) {
  const theme = mergeTheme(document);
  const resolvedTheme = resolveEmailTheme({
    ...theme,
    logoUrl: assetUrl(theme.logoUrl),
  });

  function patchBlock(id: string, patch: Partial<EmailBlock>) {
    onChange({
      ...document,
      blocks: document.blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as EmailBlock) : b,
      ),
    });
  }

  return (
    <div
      className="mx-auto w-full max-w-[560px] overflow-hidden rounded-lg border border-[var(--line)] shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
      style={{ background: resolvedTheme.cardBackground }}
      onClick={() => onSelect(null)}
    >
      <div
        className="px-7 py-8"
        style={{ background: resolvedTheme.cardBackground }}
      >
        {resolvedTheme.logoUrl ? (
          <div className="mb-5 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedTheme.logoUrl}
              alt="Logo"
              className="h-12 w-auto max-w-[200px] object-contain"
            />
          </div>
        ) : null}

        <div className="space-y-1">
          {document.blocks.map((block) => (
            <CanvasBlock
              key={block.id}
              block={block}
              theme={resolvedTheme}
              selected={selectedId === block.id}
              disabled={disabled}
              onSelect={() => onSelect(block.id)}
              onChange={(patch) => patchBlock(block.id, patch)}
            />
          ))}
        </div>

        {document.blocks.length === 0 ? (
          <p className="py-12 text-center text-[0.8125rem] text-[var(--muted)]">
            Sol menüden blok ekleyerek e-postanızı oluşturun
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CanvasBlock({
  block,
  theme,
  selected,
  disabled,
  onSelect,
  onChange,
}: {
  block: EmailBlock;
  theme: ReturnType<typeof resolveEmailTheme>;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<EmailBlock>) => void;
}) {
  const shell = (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if ((e.target as HTMLElement).isContentEditable) return;
        e.preventDefault();
        onSelect();
      }}
      className={`group relative rounded-md transition ${
        selected
          ? "ring-2 ring-[var(--brand)] ring-offset-2"
          : "hover:ring-1 hover:ring-[var(--line)]"
      }`}
    >
      {renderBlockContent(block, theme, disabled, onChange)}
    </div>
  );

  return <div className="py-1">{shell}</div>;
}

function renderBlockContent(
  block: EmailBlock,
  theme: ReturnType<typeof resolveEmailTheme>,
  disabled: boolean | undefined,
  onChange: (patch: Partial<EmailBlock>) => void,
) {
  const st = getBlockStyle(block);
  const defs = defaultsForBlockType(block.type, theme);

  switch (block.type) {
    case "heading": {
      const levelDefault = block.level === 1 ? "2xl" : "xl";
      const css = blockStyleToReactCss(st, { ...defs, fontSize: levelDefault as typeof defs.fontSize });
      return (
        <EditableText
          as={block.level === 1 ? "h1" : "h2"}
          value={block.text}
          disabled={disabled}
          style={css}
          onChange={(text) => onChange({ text })}
        />
      );
    }
    case "paragraph":
      return (
        <EditableText
          as="p"
          multiline
          value={block.text}
          disabled={disabled}
          style={blockStyleToReactCss(st, defs)}
          onChange={(text) => onChange({ text })}
        />
      );
    case "button": {
      const bg = st.backgroundColor ?? theme.primaryColor;
      const fg = st.buttonTextColor ?? st.color ?? "#ffffff";
      const pad = resolvePadding(st);
      const wrapperAlign =
        st.textAlign === "center"
          ? "text-center"
          : st.textAlign === "right"
            ? "text-right"
            : "text-left";
      return (
        <div className={wrapperAlign} style={{ paddingTop: pad.top, paddingBottom: pad.bottom }}>
          <span
            className={`rounded-md font-semibold ${st.fullWidth ? "block w-full text-center" : "inline-block"}`}
            style={{
              background: bg,
              color: fg,
              padding: `${Math.max(pad.top || 12, 12)}px ${st.paddingX ?? 24}px`,
              borderRadius: st.borderRadius ?? 6,
              ...blockStyleToReactCss(st, defs),
            }}
          >
            <EditableText
              as="span"
              value={block.label}
              disabled={disabled}
              style={{ color: fg }}
              onChange={(label) => onChange({ label })}
            />
          </span>
        </div>
      );
    }
    case "image":
      return (
        <ImageBlockEditor block={block} disabled={disabled} onChange={onChange} />
      );
    case "highlight": {
      const variant = block.variant ?? "neutral";
      const hs =
        variant === "brand"
          ? { bg: `${theme.primaryColor}14`, color: theme.primaryColor }
          : variant === "success"
            ? { bg: "#EDF3EC", color: "#346538" }
            : { bg: "#F7F6F3", color: theme.textColor };
      const pad = resolvePadding(st);
      return (
        <div
          className="rounded-lg border px-4 py-3"
          style={{
            background: st.backgroundColor ?? hs.bg,
            borderColor: `${hs.color}33`,
            borderRadius: st.borderRadius ?? 8,
            paddingTop: Math.max(pad.top, 12),
            paddingBottom: Math.max(pad.bottom, 12),
            ...blockStyleToReactCss(st, { ...defs, color: st.color ?? hs.color }),
          }}
        >
          <EditableText
            as="p"
            multiline
            value={block.text}
            disabled={disabled}
            style={{ color: st.color ?? hs.color }}
            onChange={(text) => onChange({ text })}
          />
        </div>
      );
    }
    case "list": {
      const css = blockStyleToReactCss(st, defs);
      return (
        <ul className="list-disc space-y-1 pl-5" style={css}>
          {block.items.map((item, i) => (
            <li key={i}>
              <EditableText
                as="span"
                value={item}
                disabled={disabled}
                style={{ color: css.color as string }}
                onChange={(text) => {
                  const items = [...block.items];
                  items[i] = text;
                  onChange({ items });
                }}
              />
            </li>
          ))}
        </ul>
      );
    }
    case "columns":
      return (
        <div
          className="grid grid-cols-2 gap-4"
          style={blockStyleToReactCss(st, defs)}
        >
          <EditableText
            as="p"
            multiline
            value={block.left}
            disabled={disabled}
            onChange={(left) => onChange({ left })}
          />
          <EditableText
            as="p"
            multiline
            value={block.right}
            disabled={disabled}
            onChange={(right) => onChange({ right })}
          />
        </div>
      );
    case "coupon": {
      const border = st.color ?? theme.primaryColor;
      const pad = resolvePadding(st);
      return (
        <div
          className="border-2 border-dashed px-4 py-5 text-center"
          style={{
            borderColor: border,
            borderRadius: st.borderRadius ?? 8,
            background: st.backgroundColor,
            paddingTop: Math.max(pad.top, 16),
            paddingBottom: Math.max(pad.bottom, 16),
          }}
        >
          <EditableText
            as="p"
            value={block.hint}
            disabled={disabled}
            className="mb-2"
            style={blockStyleToReactCss(st, { ...defs, fontSize: "sm" })}
            onChange={(hint) => onChange({ hint })}
          />
          <EditableText
            as="p"
            value={block.code}
            disabled={disabled}
            style={{
              ...blockStyleToReactCss(st, { ...defs, fontSize: "2xl", fontWeight: "bold" }),
              color: theme.primaryColor,
              letterSpacing: st.letterSpacing === "wide" ? "0.08em" : "0.04em",
            }}
            onChange={(code) => onChange({ code })}
          />
        </div>
      );
    }
    case "social": {
      const align =
        st.textAlign === "left"
          ? "justify-start"
          : st.textAlign === "right"
            ? "justify-end"
            : "justify-center";
      return (
        <div className={`flex flex-wrap gap-2 py-2 ${align}`}>
          {block.links.map((link, i) => (
            <span
              key={i}
              className="rounded-md border border-[var(--line)] px-3 py-1.5"
              style={{
                color: st.color ?? theme.primaryColor,
                background: st.backgroundColor,
                borderRadius: st.borderRadius ?? 6,
                ...blockStyleToReactCss(st, defs),
              }}
            >
              <EditableText
                as="span"
                value={link.label}
                disabled={disabled}
                onChange={(label) => {
                  const links = [...block.links];
                  links[i] = { ...links[i], label };
                  onChange({ links });
                }}
              />
            </span>
          ))}
        </div>
      );
    }
    case "footer":
      return (
        <EditableText
          as="p"
          multiline
          value={block.text}
          disabled={disabled}
          style={blockStyleToReactCss(st, defs)}
          onChange={(text) => onChange({ text })}
        />
      );
    case "divider": {
      const pad = resolvePadding(st);
      return (
        <hr
          className="border-0"
          style={{
            marginTop: pad.top,
            marginBottom: pad.bottom,
            borderTop: `${st.dividerThickness ?? 1}px solid ${st.dividerColor ?? "#eaeaea"}`,
          }}
        />
      );
    }
    case "spacer":
      return (
        <div
          className={
            block.size === "sm" ? "h-3" : block.size === "lg" ? "h-8" : "h-5"
          }
        />
      );
    case "quote":
      return (
        <figure
          className="border-l-4 pl-4 py-1"
          style={{ borderColor: st.color ?? theme.primaryColor }}
        >
          <p
            className="text-[17px] italic leading-relaxed"
            style={{ color: theme.textColor }}
          >
            {block.text}
          </p>
          {block.author ? (
            <figcaption className="mt-2 text-[13px]" style={{ color: theme.textColor }}>
              — {block.author}
            </figcaption>
          ) : null}
        </figure>
      );
    case "product": {
      const src = assetUrl(block.imageUrl);
      return (
        <div className="space-y-2">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={block.title} className="w-full rounded-md" />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-md bg-[var(--surface)] text-[0.75rem] text-[var(--muted)]">
              Ürün görseli ekleyin
            </div>
          )}
          <p className="text-[15px] font-semibold" style={{ color: theme.headingColor }}>
            {block.title}
          </p>
          {block.description ? (
            <p className="text-[14px] leading-snug" style={{ color: theme.textColor }}>
              {block.description}
            </p>
          ) : null}
          {block.price ? (
            <p className="text-[18px] font-bold" style={{ color: theme.headingColor }}>
              {block.price}
            </p>
          ) : null}
          <span
            className="inline-block rounded-md px-4 py-2 text-[14px] font-semibold text-white"
            style={{ background: st.backgroundColor ?? theme.primaryColor }}
          >
            {block.buttonLabel || "İncele"}
          </span>
        </div>
      );
    }
    case "video": {
      const thumb = assetUrl(block.thumbnailUrl);
      return (
        <div className="space-y-2">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={block.caption} className="w-full rounded-md" />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-md bg-[var(--background)] text-[15px] font-medium text-white">
              ▶ Kapak görseli ekleyin
            </div>
          )}
          {block.caption ? (
            <p className="text-[14px]" style={{ color: theme.textColor }}>
              {block.caption}
            </p>
          ) : null}
        </div>
      );
    }
    case "html":
      return (
        <div className="overflow-hidden rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--panel)]">
<HtmlPreviewFrame html={block.html} />
          <p className="bg-[var(--surface)] px-2 py-1 text-[0.6875rem] text-[var(--muted)]">
            HTML bloğu · düzenlemek için sağ panelden kodu değiştirin
          </p>
        </div>
      );
    default:
      return null;
  }
}

/** Sanitize edilmiş HTML'i iç içerik kadar yükseklikte gösterir. Script yok (sandbox), sadece ölçüm için same-origin. */
function HtmlPreviewFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(80);

  function measure() {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    setHeight(Math.max(40, doc.documentElement.scrollHeight));
  }

  return (
    <iframe
      ref={ref}
      title="HTML önizleme"
      srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:8px;}</style></head><body>${sanitizeEmailHtml(html)}</body></html>`}
      sandbox="allow-same-origin"
      onLoad={measure}
      style={{ height }}
      className="w-full border-0"
    />
  );
}

function EditableText({
  as: Tag,
  value,
  onChange,
  disabled,
  className,
  style,
  multiline,
}: {
  as: "h1" | "h2" | "p" | "span";
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== value) {
      el.textContent = value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref as never}
      contentEditable={!disabled}
      suppressContentEditableWarning
      className={`outline-none ${className ?? ""}`}
      style={style}
      onKeyDown={(e) => e.stopPropagation()}
      onBlur={(e) => {
        const text = multiline
          ? (e.currentTarget.innerText ?? "")
          : (e.currentTarget.textContent ?? "");
        if (text !== value) onChange(text);
      }}
      onInput={(e) => {
        const text = multiline
          ? (e.currentTarget.innerText ?? "")
          : (e.currentTarget.textContent ?? "");
        onChange(text);
      }}
    />
  );
}

function ImageBlockEditor({
  block,
  disabled,
  onChange,
}: {
  block: Extract<EmailBlock, { type: "image" }>;
  disabled?: boolean;
  onChange: (patch: Partial<EmailBlock>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const src = assetUrl(block.url);
  const st = getBlockStyle(block);
  const width = st.widthPercent ?? 100;
  const align =
    st.textAlign === "left"
      ? "mr-auto"
      : st.textAlign === "right"
        ? "ml-auto"
        : block.align === "left"
          ? "mr-auto"
          : block.align === "right"
            ? "ml-auto"
            : "mx-auto";

  async function upload(file: File) {
    setBusy(true);
    try {
      const res = await apiUpload<{ url: string }>("/email/media", file);
      onChange({ url: res.url });
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (!src) {
    return (
      <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[var(--line-strong)] bg-[var(--surface)] text-[0.8125rem] text-[var(--muted)]">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="sr-only"
          disabled={disabled || busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
        {busy ? "Yükleniyor…" : "Resim veya GIF yüklemek için tıklayın"}
      </label>
    );
  }

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={block.alt}
        className={`max-h-64 object-cover ${align}`}
        style={{
          width: `${width}%`,
          borderRadius: st.borderRadius ?? 6,
        }}
      />
      {!disabled ? (
        <label className={`${btnGhost()} inline-flex cursor-pointer`}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
          Görseli değiştir
        </label>
      ) : null}
    </div>
  );
}
