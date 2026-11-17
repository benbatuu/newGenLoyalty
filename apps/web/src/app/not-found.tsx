import Link from "next/link";

/**
 * Fallback when a request never reaches [locale] (e.g. unmatched middleware path).
 * Localized 404s use app/[locale]/not-found.tsx via [...rest] catch-all.
 */
export default function RootNotFound() {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#faf9f7",
          color: "#1a1917",
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.55,
              margin: 0,
            }}
          >
            StampWell · 404
          </p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: "1rem 0 0.75rem" }}>
            Sayfa bulunamadı
          </h1>
          <p style={{ opacity: 0.65, maxWidth: "28rem", margin: "0 auto 1.75rem", lineHeight: 1.5 }}>
            Aradığınız sayfa mevcut değil.
          </p>
          <Link
            href="/tr"
            style={{
              color: "#1a1917",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
              fontWeight: 500,
            }}
          >
            Ana sayfaya dön
          </Link>
        </main>
      </body>
    </html>
  );
}
