"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ErrorBanner,
  Panel,
  PanelHeader,
  SoftBox,
  btnGhost,
  btnPrimary,
} from "../../components/ui";
import { ApiError, api, apiDownload } from "../../lib/api";
import { useApiQuery } from "../../lib/use-api-query";

type TenantMini = {
  name: string;
  slug: string;
};

export function TableTentPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: tenant, error: loadError } = useApiQuery<TenantMini>(
    "tenant:mini",
    "/tenants/me",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [serverEnrollUrl, setServerEnrollUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enrollUrl = serverEnrollUrl;
  // Localhost veya yerel ağ adresi müşterinin telefonundan açılamaz
  const enrollIsLocal = !!enrollUrl && /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(enrollUrl);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api<{ url: string; enrollUrl: string }>("/tenants/me/invite-preview-link", {
          method: "POST",
        });
        if (!cancelled) {
          setPreviewUrl(res.url);
          setServerEnrollUrl(res.enrollUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Davet linki alınamadı");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant]);

  useEffect(() => {
    if (!previewUrl || !tenant || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 420;
    const h = 594;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = "#faf9f7";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#0f1412";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(tenant.name, w / 2, 72);

    ctx.font = "16px system-ui, sans-serif";
    ctx.fillStyle = "#5c6660";
    ctx.fillText("Telefonunu okut, Wallet'a ekle", w / 2, 108);

    void QRCode.toDataURL(previewUrl, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f1412", light: "#faf9f7" },
    }).then((qrDataUrl) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, (w - 220) / 2, 130, 220, 220);
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillStyle = "#5c6660";
        ctx.fillText("Damga topla · ödül kazan", w / 2, h - 48);
      };
      img.src = qrDataUrl;
    });
  }, [previewUrl, tenant]);

  async function downloadServerPng() {
    if (!tenant) return;
    setBusy(true);
    setError(null);
    try {
      await apiDownload("/table-tent/export.png", `table-tent-${tenant.slug}.png`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sunucu export başarısız");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPng() {
    if (!canvasRef.current || !tenant) return;
    setBusy(true);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `table-tent-${tenant.slug}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || loadError} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <PanelHeader
            title="Davet sayfası önizlemesi"
            description="Tasarım kontrolü — QR, geçici önizleme linkine gider (gerçek kayıt değil)."
          />
          <div className="flex justify-center rounded-[var(--radius-sm)] bg-[var(--surface)] p-6">
            <canvas
              ref={canvasRef}
              className="max-w-full shadow-md"
              style={{ width: 280, height: 396 }}
            />
          </div>
        </Panel>

        <aside className="space-y-5">
          <Panel>
            <PanelHeader
              title="Masa tenti indir"
              description="Yazdırıp masaya koymak için gerçek kayıt QR'sını kullanın."
            />
            <button
              type="button"
              className={btnPrimary()}
              disabled={busy}
              onClick={() => void downloadServerPng()}
            >
              {busy ? "Hazırlanıyor…" : "PNG indir (gerçek kayıt QR)"}
            </button>
            <button
              type="button"
              className={`${btnGhost()} mt-2`}
              disabled={busy || !previewUrl}
              onClick={() => void downloadPng()}
            >
              Önizleme PNG (tarayıcı)
            </button>
            {enrollUrl ? (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  Gerçek kayıt URL
                </p>
                <p className="break-all font-mono text-[10px] text-[var(--ink)]">
                  {enrollUrl}
                </p>
              </div>
            ) : null}
            {previewUrl ? (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  Önizleme URL
                </p>
                <p className="break-all font-mono text-[10px] text-[var(--muted)]">
                  {previewUrl}
                </p>
              </div>
            ) : null}
          </Panel>
          <SoftBox className="text-sm text-[var(--muted)]">
            <strong className="font-medium text-[var(--ink)]">Gerçek kayıt QR</strong>{" "}
            (<code className="text-[11px]">/wallet/enroll/…</code>) müşterinin
            telefonuyla kendi kendine kayıt olmasını sağlar. Sunucu PNG export
            bu linki kullanır.
            <br />
            <br />
            <strong className="font-medium text-[var(--ink)]">Önizleme QR</strong>{" "}
            yalnızca davet sayfası tasarımını kontrol etmek içindir; masaya
            koymak için kullanmayın.
          </SoftBox>
        </aside>
      </div>
    </div>
  );
}
