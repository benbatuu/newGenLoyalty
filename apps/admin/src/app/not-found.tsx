import Link from "next/link";

/** Tam ekran 404: admin kabuğunun (sidebar) üzerine kapanır */
export default function NotFound() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--accent-glow),transparent_65%)] opacity-50 blur-3xl"
      />

      <div className="relative">
        <p className="notfound-code select-none font-display text-[9rem] font-semibold leading-none tracking-tight sm:text-[12rem]">
          404
        </p>
        <div className="mx-auto -mt-3 h-1 w-24 rounded-full bg-[var(--accent)]" />
      </div>

      <h1 className="relative mt-8 font-display text-2xl font-semibold text-[var(--ink)] sm:text-3xl">
        Bu sayfa bulunamadı
      </h1>
      <p className="relative mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        Adres değişmiş ya da hiç olmamış olabilir. Panele dönerek devam edebilirsiniz.
      </p>

      <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(239,35,60,0.3)] transition hover:bg-[var(--accent-deep)] active:translate-y-px"
        >
          Panele dön
        </Link>
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-6 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface)]"
        >
          Girişe git
        </Link>
      </div>

      <style>{`
        .notfound-code {
          color: transparent;
          -webkit-text-stroke: 1.5px var(--accent);
          animation: nf-in 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes nf-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .notfound-code { animation: none; } }
      `}</style>
    </div>
  );
}
