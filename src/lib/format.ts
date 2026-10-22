import type { Commodity, EntityType } from '../../pipeline/types.ts';

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** Megatonnes, switching to gigatonnes at 1,000 Mt. */
export function formatMt(mt: number): string {
  if (Math.abs(mt) >= 1000) return `${nf1.format(mt / 1000)} Gt`;
  if (Math.abs(mt) >= 10) return `${nf0.format(mt)} Mt`;
  return `${nf1.format(mt)} Mt`;
}

export function formatPct(fraction: number): string {
  const pct = fraction * 100;
  if (pct > 0 && pct < 0.1) return '<0.1%';
  return `${pct.toFixed(1)}%`;
}

export const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  'investor-owned': 'Investor-owned',
  'state-owned': 'State-owned',
  'nation-state': 'Nation-state',
};

export const COMMODITY_LABEL: Record<Commodity, string> = {
  oil_ngl: 'Oil & NGL',
  natural_gas: 'Natural gas',
  coal: 'Coal',
  cement: 'Cement',
};

/** Flag emoji for an ISO 3166-1 alpha-2 code ('' for null/invalid). */
export function flagFromIso2(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return '';
  return [...code].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
}
