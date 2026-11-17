export function formatChangePreview(template: string, sample: string): string {
  const t = template.trim() || "%@";
  return t.includes("%@") ? t.replace(/%@/g, sample) : `${t} ${sample}`;
}

export function computeStampGrid(stampsRequired: number): {
  cols: number;
  rows: number;
} {
  const n = Math.max(1, Math.min(Math.floor(stampsRequired) || 1, 16));
  if (n <= 5) return { cols: n, rows: 1 };
  for (const cols of [5, 4, 3] as const) {
    if (n % cols === 0) {
      const rows = n / cols;
      if (rows <= 4) return { cols, rows };
    }
  }
  if (n <= 8) return { cols: 4, rows: Math.ceil(n / 4) };
  return { cols: 5, rows: Math.ceil(n / 5) };
}
