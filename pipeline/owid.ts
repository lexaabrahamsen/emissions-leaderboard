import { parseCsv } from './lib/csv.ts';
import type { CountriesYear, CountryEmissions, CountryFootprint } from './types.ts';

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
  /** Total CO2 per country for the latest year that most countries report. */
  countries: CountriesYear | null;
}

// A year counts as "complete" for the map once this many countries report CO2; OWID's newest
// year is sometimes only partly filled in.
const MIN_COUNTRIES_FOR_MAP_YEAR = 100;

export function parseOwid(csvText: string): OwidParsed {
  const records = parseCsv(csvText);
  const latest = new Map<string, CountryFootprint>();
  const worldCo2ByYear = new Map<number, number>();
  const countriesByYear = new Map<number, CountryEmissions[]>();

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

    const co2Mt = num(r.co2);
    if (co2Mt !== null) {
      const rows = countriesByYear.get(year) ?? [];
      rows.push({ iso3: iso, name: r.country, population: num(r.population), co2Mt, co2PerCapitaT: num(r.co2_per_capita) });
      countriesByYear.set(year, rows);
    }

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
    countries: pickCountriesYear(countriesByYear),
  };
}

function pickCountriesYear(byYear: Map<number, CountryEmissions[]>): CountriesYear | null {
  const years = [...byYear.keys()].filter((y) => byYear.get(y)!.length >= MIN_COUNTRIES_FOR_MAP_YEAR);
  if (years.length === 0) return null;
  const year = Math.max(...years);
  return { year, rows: byYear.get(year)!.sort((a, b) => b.co2Mt - a.co2Mt) };
}
