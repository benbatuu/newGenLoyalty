"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { btnGhost, btnPrimary } from "./ui";

type Props = {
  url: string;
  phoneLabel?: string;
  onClose: () => void;
};

export function InviteQrModal({ url, phoneLabel, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f1412", light: "#ffffff" },
    }).then((d) => {
      if (!cancelled) setDataUrl(d);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-qr-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--line)] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="invite-qr-title"
          className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]"
        >
          Wallet davet QR
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Müşteri telefonuyla bu kodu tarasın; Apple / Google Wallet sayfası
          açılır.
          {phoneLabel ? (
            <>
              {" "}
              <span className="font-medium text-[var(--ink)]">{phoneLabel}</span>
            </>
          ) : null}
        </p>

        <div className="mt-4 flex justify-center rounded-[var(--radius-sm)] bg-[var(--surface)] p-4">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt="Wallet davet QR kodu"
              width={280}
              height={280}
              className="h-[220px] w-[220px] sm:h-[260px] sm:w-[260px]"
            />
          ) : (
            <div className="flex h-[220px] w-[220px] items-center justify-center text-sm text-[var(--muted)] sm:h-[260px] sm:w-[260px]">
              QR hazırlanıyor…
            </div>
          )}
        </div>

        <p className="mt-3 break-all rounded-[var(--radius-sm)] bg-[var(--surface)] px-3 py-2 font-mono text-[10px] leading-relaxed text-[var(--muted)]">
          {url}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" className={`${btnPrimary()} flex-1`} onClick={() => void copyLink()}>
            {copied ? "Kopyalandı" : "Linki kopyala"}
          </button>
          <button type="button" className={`${btnGhost()} flex-1`} onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
