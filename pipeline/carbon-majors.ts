import { parseCsv, pickColumn } from './lib/csv.ts';
import { slugify } from './lib/slug.ts';
import type { Commodity, EmissionRow, EntityType } from './types.ts';

// Column names have shifted between Carbon Majors releases; list known variants.
const COLS = {
  year: ['year'],
  entity: ['parent_entity', 'entity'],
  type: ['parent_type', 'entity_type'],
  commodity: ['commodity'],
  production: ['production_value', 'commodity_production'],
  unit: ['production_unit', 'commodity_unit'],
  total: ['total_emissions_MtCO2e', 'total_emissions'],
};

export function mapEntityType(raw: string): EntityType {
  const s = raw.toLowerCase();
  if (s.includes('investor')) return 'investor-owned';
  if (s.includes('state-owned') || s.includes('state owned')) return 'state-owned';
  if (s.includes('nation')) return 'nation-state';
  throw new Error(`Unknown entity type: "${raw}"`);
}

export function mapCommodity(raw: string): Commodity {
  const s = raw.toLowerCase();
  if (s.includes('coal') || s.includes('lignite') || s.includes('anthracite')) return 'coal';
  if (s.includes('oil') || s.includes('ngl')) return 'oil_ngl';
  if (s.includes('gas')) return 'natural_gas';
  if (s.includes('cement')) return 'cement';
  throw new Error(`Unknown commodity: "${raw}"`);
}

export function parseCarbonMajors(csvText: string): EmissionRow[] {
  const records = parseCsv(csvText);
  if (records.length === 0) throw new Error('Carbon Majors file is empty');
  const headers = Object.keys(records[0]);
  const c = Object.fromEntries(
    Object.entries(COLS).map(([k, cands]) => [k, pickColumn(headers, cands, k)]),
  ) as Record<keyof typeof COLS, string>;

  return records.map((r, i) => {
    const line = i + 2;
    const year = Number(r[c.year]);
    const total = Number(r[c.total]);
    if (!Number.isInteger(year)) throw new Error(`Line ${line}: bad year "${r[c.year]}"`);
    if (!Number.isFinite(total)) throw new Error(`Line ${line}: bad total "${r[c.total]}"`);
    const prod = r[c.production]?.trim();
    const entity = r[c.entity].trim();
    return {
      entity,
      slug: slugify(entity),
      entityType: mapEntityType(r[c.type]),
      year,
      commodity: mapCommodity(r[c.commodity]),
      commodityRaw: r[c.commodity].trim(),
      production: prod ? Number(prod) : null,
      productionUnit: r[c.unit]?.trim() ?? '',
      totalMtCO2e: total,
    };
  });
}
