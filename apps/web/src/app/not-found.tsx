import Link from "next/link";

/** Fallback when 404 is rendered outside `[locale]` (rare with localePrefix: always). */
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
          background: "#0c0b0a",
          color: "#f5f0e8",
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem" }}>
          <p
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            Dokun &amp; Kazan
          </p>
          <h1 style={{ fontSize: "2rem", fontWeight: 300, margin: "1rem 0" }}>
            Sayfa bulunamadı
          </h1>
          <p style={{ opacity: 0.7, maxWidth: "28rem", margin: "0 auto 2rem" }}>
            Aradığınız sayfa mevcut değil.
          </p>
          <Link
            href="/tr"
            style={{
              color: "#c9a962",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
            }}
          >
            Ana sayfaya dön
          </Link>
        </main>
      </body>
    </html>
  );
}
