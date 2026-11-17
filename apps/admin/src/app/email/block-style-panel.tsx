"use client";

import {
  FONT_SIZE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  SPACING_OPTIONS,
  getBlockStyle,
  patchBlockStyle,
  type EmailBlock,
  type EmailBlockStyle,
  type EmailBorderRadius,
  type EmailFontFamily,
  type EmailFontSize,
  type EmailFontWeight,
  type EmailImageWidth,
  type EmailLineHeight,
  type EmailSpacing,
  type EmailTextAlign,
} from "@ngl/shared";
import { Field, btnGhost, inputClassName } from "../../components/ui";

type BlockStylePanelProps = {
  block: EmailBlock;
  disabled?: boolean;
  onChange: (patch: Partial<EmailBlock>) => void;
};

function patch(
  block: EmailBlock,
  stylePatch: Partial<EmailBlockStyle>,
  onChange: (patch: Partial<EmailBlock>) => void,
) {
  onChange({ style: patchBlockStyle(block, stylePatch) });
}

const TEXT_BLOCKS = new Set([
  "heading",
  "paragraph",
  "highlight",
  "list",
  "columns",
  "footer",
  "coupon",
]);

const ALIGN_BLOCKS = new Set([
  "heading",
  "paragraph",
  "button",
  "image",
  "highlight",
  "list",
  "columns",
  "social",
  "footer",
  "coupon",
]);

export function BlockStylePanel({ block, disabled, onChange }: BlockStylePanelProps) {
  const st = getBlockStyle(block);

  return (
    <div className="space-y-3 border-t border-[var(--line)] pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
        Görünüm
      </p>

      {TEXT_BLOCKS.has(block.type) ? (
        <>
          <SelectField
            label="Yazı boyutu"
            value={st.fontSize ?? ""}
            disabled={disabled}
            onChange={(v) =>
              patch(block, { fontSize: (v || undefined) as EmailFontSize | undefined }, onChange)
            }
            options={[{ value: "", label: "Varsayılan" }, ...FONT_SIZE_OPTIONS]}
          />
          <SelectField
            label="Kalınlık"
            value={st.fontWeight ?? ""}
            disabled={disabled}
            onChange={(v) =>
              patch(block, { fontWeight: (v || undefined) as EmailFontWeight | undefined }, onChange)
            }
            options={[{ value: "", label: "Varsayılan" }, ...FONT_WEIGHT_OPTIONS]}
          />
          <SelectField
            label="Yazı tipi"
            value={st.fontFamily ?? ""}
            disabled={disabled}
            onChange={(v) =>
              patch(block, { fontFamily: (v || undefined) as EmailFontFamily | undefined }, onChange)
            }
            options={[
              { value: "", label: "Sans (varsayılan)" },
              { value: "sans", label: "Sans-serif" },
              { value: "serif", label: "Serif" },
            ]}
          />
          <SelectField
            label="Satır aralığı"
            value={st.lineHeight ?? ""}
            disabled={disabled}
            onChange={(v) =>
              patch(block, { lineHeight: (v || undefined) as EmailLineHeight | undefined }, onChange)
            }
            options={[
              { value: "", label: "Varsayılan" },
              { value: "tight", label: "Sıkı" },
              { value: "normal", label: "Normal" },
              { value: "relaxed", label: "Geniş" },
            ]}
          />
          <ColorField
            label="Yazı rengi"
            value={st.color ?? ""}
            disabled={disabled}
            onChange={(v) => patch(block, { color: v || undefined }, onChange)}
          />
        </>
      ) : null}

      {block.type === "button" ? (
        <>
          <SelectField
            label="Yazı boyutu"
            value={st.fontSize ?? ""}
            disabled={disabled}
            onChange={(v) =>
              patch(block, { fontSize: (v || undefined) as EmailFontSize | undefined }, onChange)
            }
            options={[{ value: "", label: "Varsayılan" }, ...FONT_SIZE_OPTIONS.slice(0, 5)]}
          />
          <ColorField
            label="Buton rengi"
            value={st.backgroundColor ?? ""}
            disabled={disabled}
            onChange={(v) => patch(block, { backgroundColor: v || undefined }, onChange)}
          />
          <ColorField
            label="Yazı rengi"
            value={st.buttonTextColor ?? st.color ?? ""}
            disabled={disabled}
            onChange={(v) => patch(block, { buttonTextColor: v || undefined }, onChange)}
          />
          <SelectField
            label="Köşe yuvarlaklığı"
            value={String(st.borderRadius ?? "")}
            disabled={disabled}
            onChange={(v) =>
              patch(block, {
                borderRadius: v ? (Number(v) as EmailBorderRadius) : undefined,
              }, onChange)
            }
            options={[
              { value: "", label: "6 px" },
              { value: "0", label: "Köşeli" },
              { value: "4", label: "4 px" },
              { value: "8", label: "8 px" },
              { value: "12", label: "12 px" },
              { value: "24", label: "24 px" },
            ]}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(st.fullWidth)}
              disabled={disabled}
              onChange={(e) => patch(block, { fullWidth: e.target.checked }, onChange)}
            />
            Tam genişlik buton
          </label>
        </>
      ) : null}

      {block.type === "image" ? (
        <>
          <SelectField
            label="Görsel genişliği"
            value={String(st.widthPercent ?? "")}
            disabled={disabled}
            onChange={(v) =>
              patch(block, {
                widthPercent: v ? (Number(v) as EmailImageWidth) : undefined,
              }, onChange)
            }
            options={[
              { value: "", label: "Tam genişlik (100%)" },
              { value: "80", label: "80%" },
              { value: "60", label: "60%" },
              { value: "40", label: "40%" },
            ]}
          />
          <SelectField
            label="Köşe yuvarlaklığı"
            value={String(st.borderRadius ?? "")}
            disabled={disabled}
            onChange={(v) =>
              patch(block, {
                borderRadius: v ? (Number(v) as EmailBorderRadius) : undefined,
              }, onChange)
            }
            options={[
              { value: "", label: "6 px" },
              { value: "0", label: "Köşeli" },
              { value: "8", label: "8 px" },
              { value: "12", label: "12 px" },
            ]}
          />
        </>
      ) : null}

      {block.type === "highlight" ? (
        <ColorField
          label="Kutu arka planı"
          value={st.backgroundColor ?? ""}
          disabled={disabled}
          onChange={(v) => patch(block, { backgroundColor: v || undefined }, onChange)}
        />
      ) : null}

      {block.type === "social" ? (
        <>
          <SelectField
            label="Yazı boyutu"
            value={st.fontSize ?? ""}
            disabled={disabled}
            onChange={(v) =>
              patch(block, { fontSize: (v || undefined) as EmailFontSize | undefined }, onChange)
            }
            options={[{ value: "", label: "Varsayılan" }, ...FONT_SIZE_OPTIONS.slice(0, 4)]}
          />
          <ColorField
            label="Link rengi"
            value={st.color ?? ""}
            disabled={disabled}
            onChange={(v) => patch(block, { color: v || undefined }, onChange)}
          />
          <ColorField
            label="Arka plan"
            value={st.backgroundColor ?? ""}
            disabled={disabled}
            onChange={(v) => patch(block, { backgroundColor: v || undefined }, onChange)}
          />
        </>
      ) : null}

      {block.type === "divider" ? (
        <>
          <ColorField
            label="Çizgi rengi"
            value={st.dividerColor ?? ""}
            disabled={disabled}
            onChange={(v) => patch(block, { dividerColor: v || undefined }, onChange)}
          />
          <SelectField
            label="Kalınlık"
            value={String(st.dividerThickness ?? "")}
            disabled={disabled}
            onChange={(v) =>
              patch(block, {
                dividerThickness: v ? (Number(v) as 1 | 2 | 3) : undefined,
              }, onChange)
            }
            options={[
              { value: "", label: "1 px" },
              { value: "2", label: "2 px" },
              { value: "3", label: "3 px" },
            ]}
          />
        </>
      ) : null}

      {ALIGN_BLOCKS.has(block.type) ? (
        <SelectField
          label="Hizalama"
          value={st.textAlign ?? (block.type === "image" ? block.align ?? "" : "")}
          disabled={disabled}
          onChange={(v) => {
            const align = (v || undefined) as EmailTextAlign | undefined;
            if (block.type === "image") {
              onChange({ align: align ?? "center", style: patchBlockStyle(block, { textAlign: align }) });
            } else {
              patch(block, { textAlign: align }, onChange);
            }
          }}
          options={[
            { value: "", label: "Varsayılan" },
            { value: "left", label: "Sola" },
            { value: "center", label: "Ortala" },
            { value: "right", label: "Sağa" },
          ]}
        />
      ) : null}

      {block.type !== "divider" && block.type !== "spacer" ? (
        <>
          <SelectField
            label="Üst boşluk"
            value={String(st.paddingTop ?? "")}
            disabled={disabled}
            onChange={(v) =>
              patch(block, {
                paddingTop: v !== "" ? (Number(v) as EmailSpacing) : undefined,
              }, onChange)
            }
            options={[
              { value: "", label: "Varsayılan" },
              ...SPACING_OPTIONS.map((o) => ({ value: String(o.value), label: o.label })),
            ]}
          />
          <SelectField
            label="Alt boşluk"
            value={String(st.paddingBottom ?? "")}
            disabled={disabled}
            onChange={(v) =>
              patch(block, {
                paddingBottom: v !== "" ? (Number(v) as EmailSpacing) : undefined,
              }, onChange)
            }
            options={[
              { value: "", label: "Varsayılan" },
              ...SPACING_OPTIONS.map((o) => ({ value: String(o.value), label: o.label })),
            ]}
          />
          {(block.type === "button" ||
            block.type === "highlight" ||
            block.type === "coupon") ? (
            <SelectField
              label="Yatay iç boşluk"
              value={String(st.paddingX ?? "")}
              disabled={disabled}
              onChange={(v) =>
                patch(block, {
                  paddingX: v !== "" ? (Number(v) as EmailSpacing) : undefined,
                }, onChange)
              }
              options={[
                { value: "", label: "Varsayılan" },
                ...SPACING_OPTIONS.slice(1).map((o) => ({
                  value: String(o.value),
                  label: o.label,
                })),
              ]}
            />
          ) : null}
          {(block.type === "heading" || block.type === "coupon") ? (
            <SelectField
              label="Harf aralığı"
              value={st.letterSpacing ?? ""}
              disabled={disabled}
              onChange={(v) =>
                patch(block, {
                  letterSpacing: v ? (v as "normal" | "wide") : undefined,
                }, onChange)
              }
              options={[
                { value: "", label: "Normal" },
                { value: "wide", label: "Geniş" },
              ]}
            />
          ) : null}
        </>
      ) : null}

      {Object.keys(st).length > 0 ? (
        <button
          type="button"
          className={`${btnGhost()} w-full text-xs`}
          disabled={disabled}
          onClick={() => onChange({ style: undefined })}
        >
          Stilleri sıfırla
        </button>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={inputClassName()}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ColorField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#333333"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-[var(--line)]"
        />
        <input
          className={inputClassName()}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Varsayılan"
        />
        {value ? (
          <button type="button" className={btnGhost()} disabled={disabled} onClick={() => onChange("")}>
            ×
          </button>
        ) : null}
      </div>
    </Field>
  );
}
