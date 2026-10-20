import { parseCsv } from './lib/csv.ts';
import type { CountryFootprint } from './types.ts';

// Columns from OWID's owid-co2-data.csv. Check the codebook if a release renames them.
const num = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export interface OwidParsed {
  /** Latest year with a per-capita value, per country (real ISO3 codes only). */
  footprints: CountryFootprint[];
  /** World fossil + industry CO2 (Mt) by year — denominator for share-of-global stats. */
  worldCo2ByYear: Map<number, number>;
}

export function parseOwid(csvText: string): OwidParsed {
  const records = parseCsv(csvText);
  const latest = new Map<string, CountryFootprint>();
  const worldCo2ByYear = new Map<number, number>();

  for (const r of records) {
    const year = Number(r.year);
    const iso = (r.iso_code ?? '').trim();

    if (r.country === 'World') {
      const co2 = num(r.co2);
      if (co2 !== null) worldCo2ByYear.set(year, co2);
      continue;
    }
    // Skip OWID aggregates (OWID_EU27 etc.) and regions without codes.
    if (!/^[A-Z]{3}$/.test(iso)) continue;

    const fp: CountryFootprint = {
      iso3: iso,
      name: r.country,
      year,
      co2PerCapitaT: num(r.co2_per_capita),
      consumptionCo2PerCapitaT: num(r.consumption_co2_per_capita),
      ghgPerCapitaT: num(r.ghg_per_capita),
    };
    if (fp.co2PerCapitaT === null) continue;
    const prev = latest.get(iso);
    if (!prev || prev.year < year) latest.set(iso, fp);
  }

  return {
    footprints: [...latest.values()].sort((a, b) => a.name.localeCompare(b.name)),
    worldCo2ByYear,
  };
}
