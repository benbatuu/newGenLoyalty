/** Admin public API base — no production localhost fallback. */

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

export function getApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return stripSlash(fromEnv);
  if (process.env.NODE_ENV !== "production") return "http://localhost:3001";
  throw new Error("NEXT_PUBLIC_API_URL is required in production");
}
