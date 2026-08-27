/**
 * Admin talks to the API via same-origin `/backend/*` proxy
 * (see app/backend/[...path]/route.ts). That way Vercel only needs
 * server-side API_URL — no NEXT_PUBLIC_ required in the browser.
 */

export function getApiUrl(): string {
  return "/backend";
}
