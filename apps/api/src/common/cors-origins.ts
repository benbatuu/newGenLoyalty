/** Resolve allowed browser origins for CORS (admin, marketing, web). */
export function resolveCorsOrigins(): string[] {
  const urls = [
    process.env.ADMIN_URL,
    process.env.WEB_URL,
    process.env.MARKETING_URL,
  ]
    .filter(Boolean)
    .map((u) => u!.trim().replace(/\/$/, ''));

  if (urls.length > 0) return urls;

  return [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3003',
  ];
}

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  return resolveCorsOrigins().includes(normalized);
}
