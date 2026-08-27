/** Admin API base — accepts API_URL or NEXT_PUBLIC_API_URL (Vercel). */

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return stripSlash(v);
  }
  return undefined;
}

export function getApiUrl(): string {
  const fromEnv = firstEnv("NEXT_PUBLIC_API_URL", "API_URL");
  if (fromEnv) {
    if (fromEnv.startsWith("http")) return fromEnv;
    return `https://${fromEnv}`;
  }
  if (process.env.NODE_ENV !== "production") return "http://localhost:3001";
  // Do not throw during prerender/_not-found — Vercel maps API_URL via next.config
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.VERCEL === "1"
  ) {
    console.warn(
      "[urls] API_URL missing at build — set API_URL in Vercel (Environment Variables, available for Build)",
    );
    return "";
  }
  throw new Error("API_URL is required in production");
}
