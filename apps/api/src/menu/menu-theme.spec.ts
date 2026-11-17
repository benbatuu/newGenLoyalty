import {
  defaultThemeConfig,
  mergeThemeConfig,
  normalizeMenuThemePreset,
  resolveMenuTheme,
  themeHasLowContrast,
  createDefaultMenuDocument,
  normalizeMenuDocument,
} from '@ngl/shared';

describe('menu theme merge', () => {
  it('falls back to editorial for unknown preset', () => {
    expect(normalizeMenuThemePreset('unknown')).toBe('editorial');
  });

  it('fills missing config from preset defaults', () => {
    const merged = mergeThemeConfig('catalog', { hero: { showLogo: false } });
    expect(merged.hero.showLogo).toBe(false);
    expect(merged.categoryNav.mode).toBe('grid');
    expect(merged.productCard.layout).toBe('card');
  });

  it('clamps column counts', () => {
    const merged = mergeThemeConfig('editorial', {
      categoryNav: { columnsMobile: 99, columnsDesktop: 1 },
    });
    expect(merged.categoryNav.columnsMobile).toBe(3);
    expect(merged.categoryNav.columnsDesktop).toBe(2);
  });

  it('rejects invalid hex colors', () => {
    const fallback = defaultThemeConfig('editorial');
    const merged = mergeThemeConfig('editorial', {
      style: { primaryColor: 'red', accentColor: '#zzzzzz' },
    });
    expect(merged.style.primaryColor).toBe(fallback.style.primaryColor);
  });

  it('resolves a complete theme for empty tenant fields', () => {
    const theme = resolveMenuTheme(undefined, null, null);
    expect(theme.preset).toBe('editorial');
    expect(theme.config.page.showFooterBranding).toBe(true);
  });

  it('flags very low contrast colors', () => {
    const config = defaultThemeConfig('editorial');
    config.style.surfaceStyle = 'paper';
    config.style.primaryColor = '#f6f3ee';
    config.style.accentColor = '#f6f3ee';
    expect(themeHasLowContrast(config)).toBe(true);
  });

  it('builds a document with drilldown navigation', () => {
    const doc = createDefaultMenuDocument('editorial');
    expect(doc.version).toBe(2);
    expect(doc.navigation).toBe('drilldown');
    expect(doc.blocks.some((b) => b.type === 'categories')).toBe(true);
    const normalized = normalizeMenuDocument({ version: 2, blocks: [] }, 'editorial');
    expect(normalized.blocks.length).toBeGreaterThan(0);
  });
});
