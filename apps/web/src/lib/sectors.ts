/**
 * URL slugs for the sector pages. Order matches `sectorsPage.items` in
 * messages/*.json, so index i in the copy is slug i here.
 */
export const SECTOR_SLUGS = [
  "cafe",
  "specialty-coffee",
  "bakery",
  "gelato",
  "quick-service",
  "retail",
] as const;

export type SectorSlug = (typeof SECTOR_SLUGS)[number];

export function sectorIndex(slug: string): number {
  return (SECTOR_SLUGS as readonly string[]).indexOf(slug);
}
