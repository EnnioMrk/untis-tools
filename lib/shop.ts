export const SHOP_THEME_IDS = ['DEFAULT', 'MIDNIGHT', 'SUNSET', 'FOREST', 'AURORA'] as const;

export type ShopThemeId = (typeof SHOP_THEME_IDS)[number];

export interface ShopThemeDefinition {
  id: ShopThemeId;
  name: string;
  description: string;
  priceEuroCents: number;
  previewClass: string;
  pageClass: string;
  headerClass: string;
  badgeClass: string;
}

export const SHOP_THEMES: readonly ShopThemeDefinition[] = [
  {
    id: 'DEFAULT',
    name: 'Default',
    description: 'Clean and minimal with a neutral dashboard background.',
    priceEuroCents: 0,
    previewClass: 'from-slate-100 via-white to-slate-200',
    pageClass: 'bg-gray-50',
    headerClass: 'border-gray-200 bg-white/85',
    badgeClass: 'bg-slate-100 text-slate-700',
  },
  {
    id: 'MIDNIGHT',
    name: 'Midnight Pulse',
    description: 'Deep indigo panels with a neon edge for focused late-night sessions.',
    priceEuroCents: 99,
    previewClass: 'from-slate-950 via-indigo-900 to-cyan-700',
    pageClass: 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950',
    headerClass: 'border-cyan-400/30 bg-slate-900/75',
    badgeClass: 'bg-cyan-400/15 text-cyan-200',
  },
  {
    id: 'SUNSET',
    name: 'Sunset Glow',
    description: 'Warm coral and amber tones that make the dashboard feel energetic.',
    priceEuroCents: 149,
    previewClass: 'from-orange-500 via-rose-500 to-purple-700',
    pageClass: 'bg-gradient-to-br from-orange-50 via-rose-50 to-purple-100',
    headerClass: 'border-rose-200 bg-white/80',
    badgeClass: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'FOREST',
    name: 'Forest Calm',
    description: 'Fresh greens and soft shadows for a quieter, more grounded look.',
    priceEuroCents: 199,
    previewClass: 'from-emerald-800 via-green-700 to-lime-500',
    pageClass: 'bg-gradient-to-br from-emerald-50 via-green-50 to-lime-100',
    headerClass: 'border-emerald-200 bg-white/80',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'AURORA',
    name: 'Aurora Drift',
    description: 'A vivid premium gradient with teal, violet, and blue highlights.',
    priceEuroCents: 299,
    previewClass: 'from-teal-400 via-sky-500 to-violet-600',
    pageClass: 'bg-gradient-to-br from-sky-50 via-cyan-50 to-violet-100',
    headerClass: 'border-violet-200 bg-white/80',
    badgeClass: 'bg-violet-100 text-violet-700',
  },
] as const;

const SHOP_THEME_ID_SET = new Set<ShopThemeId>(SHOP_THEMES.map((theme) => theme.id));

export function normalizeShopTheme(theme: string | null | undefined): ShopThemeId {
  if (theme && SHOP_THEME_ID_SET.has(theme as ShopThemeId)) {
    return theme as ShopThemeId;
  }

  return 'DEFAULT';
}

export function getShopTheme(theme: string | null | undefined): ShopThemeDefinition {
  return SHOP_THEMES.find((entry) => entry.id === normalizeShopTheme(theme)) || SHOP_THEMES[0];
}

export function getPaidThemes(): ShopThemeDefinition[] {
  return SHOP_THEMES.filter((theme) => theme.priceEuroCents > 0);
}

export function formatEuroCents(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value / 100);
}
