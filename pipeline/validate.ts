import type { CountryFootprint, EmissionRow } from './types.ts';

// Sanity checks that fail the build. Add to this list every time you find a data quirk;
// the list doubles as raw material for the methodology page.

export function validateEmissions(rows: EmissionRow[]): string[] {
  const errors: string[] = [];
  const thisYear = new Date().getFullYear();
  const seen = new Set<string>();

  for (const r of rows) {
    const key = `${r.slug}|${r.year}|${r.commodityRaw}`;
    if (seen.has(key)) errors.push(`Duplicate row: ${key}`);
    seen.add(key);
    if (r.year < 1800 || r.year > thisYear) errors.push(`${r.entity}: implausible year ${r.year}`);
    if (r.totalMtCO2e < 0) errors.push(`${r.entity} ${r.year}: negative emissions ${r.totalMtCO2e}`);
    if (r.totalMtCO2e > 5000) errors.push(`${r.entity} ${r.year}: ${r.totalMtCO2e} Mt in one commodity-year looks wrong`);
    if (!r.slug) errors.push(`Empty slug for entity "${r.entity}"`);
  }

  // An entity should keep one ownership type across its history.
  const typeBySlug = new Map<string, string>();
  for (const r of rows) {
    const prev = typeBySlug.get(r.slug);
    if (prev && prev !== r.entityType) errors.push(`${r.entity}: type changes (${prev} → ${r.entityType})`);
    typeBySlug.set(r.slug, r.entityType);
  }
  return errors;
}

export function validateFootprints(fps: CountryFootprint[]): string[] {
  const errors: string[] = [];
  for (const f of fps) {
    if (f.co2PerCapitaT !== null && (f.co2PerCapitaT < 0 || f.co2PerCapitaT > 100)) {
      errors.push(`${f.name}: implausible per-capita CO2 ${f.co2PerCapitaT}`);
    }
  }
  return errors;
}
