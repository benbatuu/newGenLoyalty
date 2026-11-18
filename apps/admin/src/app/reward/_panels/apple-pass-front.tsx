"use client";

import type { CSSProperties, ReactNode } from "react";

export type ApplePassField = { key: string; label: string; value: string };

const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * Apple Wallet "storeCard" ön yüzü — iOS Wallet'taki düzene göre:
 * logo/üst yazı solda, header alanları sağda, tam genişlik şerit,
 * büyük harfli küçük etiket + normal ağırlıkta değer, beyaz zeminli barkod ve altında kod.
 */
export function ApplePassFront({
  background,
  fg,
  label,
  logo,
  logoText,
  header,
  strip,
  primary,
  fields,
  aux,
  barcode,
  altText,
  expiresText,
}: {
  background: string;
  fg: string;
  label: string;
  logo?: string | null;
  logoText?: string;
  header?: ApplePassField[];
  /** Tam genişlik şerit (375×123 oranında) */
  strip?: ReactNode;
  /** Şerit yoksa büyük birincil alan */
  primary?: { label: string; value: string };
  fields: ApplePassField[];
  /** Yardımcı (auxiliary) alanlar — ikinci satır */
  aux?: ApplePassField[];
  /** Verilmezse barkod çizilmez (Apple barkodsuz pass'e izin verir) */
  barcode?: ReactNode;
  altText?: string;
  expiresText?: string;
}) {
  const style: CSSProperties = { background, color: fg, fontFamily: APPLE_FONT };
  return (
    <div
      className="w-full overflow-hidden rounded-[14px] shadow-[0_10px_28px_rgba(0,0,0,0.3)]"
      style={style}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div className="flex min-w-0 items-center gap-2">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-[45px] max-w-[145px] object-contain object-left" />
          ) : null}
          {logoText ? (
            <span className="truncate text-[15px] leading-tight">{logoText}</span>
          ) : null}
        </div>
        {header && header.length > 0 ? (
          <div className="flex shrink-0 gap-4 text-right">
            {header.map((f) => (
              <div key={f.key}>
                <p className="text-[10px] uppercase leading-tight tracking-[0.04em]" style={{ color: label }}>
                  {f.label}
                </p>
                <p className="text-[17px] leading-tight">{f.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {strip ? <div className="mt-3 w-full">{strip}</div> : null}

      {primary ? (
        <div className="px-4 pt-3">
          <p className="text-[10px] uppercase tracking-[0.04em]" style={{ color: label }}>
            {primary.label}
          </p>
          <p className="text-[40px] font-light leading-none tabular-nums">{primary.value}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-5 gap-y-3 px-4 pt-4">
        {fields.map((f) => (
          <div key={f.key} className="min-w-0 flex-1 basis-[28%]">
            <p className="truncate text-[10px] uppercase tracking-[0.04em]" style={{ color: label }}>
              {f.label}
            </p>
            <p className="truncate text-[17px] leading-snug">{f.value}</p>
          </div>
        ))}
      </div>

      {aux && aux.length > 0 ? (
        <div className="flex flex-wrap gap-x-5 gap-y-3 px-4 pt-3">
          {aux.map((f) => (
            <div key={f.key} className="min-w-0 flex-1 basis-[22%]">
              <p className="truncate text-[10px] uppercase tracking-[0.04em]" style={{ color: label }}>
                {f.label}
              </p>
              <p className="truncate text-[15px] leading-snug">{f.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {barcode ? (
        <div className="mx-auto mt-5 flex w-[56%] min-w-[150px] flex-col items-center rounded-lg bg-white p-2.5">
          {barcode}
          {altText ? <p className="mt-1 text-[11px] tracking-[0.06em] text-black">{altText}</p> : null}
        </div>
      ) : null}
      {expiresText ? (
        <p className="px-4 pt-3 text-center text-[10px]" style={{ color: label }}>
          {expiresText}
        </p>
      ) : null}
      <div className="h-5" />
    </div>
  );
}
