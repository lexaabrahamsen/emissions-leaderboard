// Shared types between the build pipeline (pipeline/) and the site (src/).
// The pipeline emits JSON matching these shapes into public/data/.

export type EntityType = 'investor-owned' | 'state-owned' | 'nation-state';
export type Commodity = 'oil_ngl' | 'natural_gas' | 'coal' | 'cement';

export const COMMODITIES: readonly Commodity[] = ['oil_ngl', 'natural_gas', 'coal', 'cement'];
export const ENTITY_TYPES: readonly EntityType[] = ['investor-owned', 'state-owned', 'nation-state'];

/** One normalized row from the Carbon Majors medium-granularity file. */
export interface EmissionRow {
  entity: string; // display name as published
  slug: string;
  entityType: EntityType;
  year: number;
  commodity: Commodity;
  commodityRaw: string; // e.g. "Thermal Coal" — kept for detail pages
  production: number | null;
  productionUnit: string;
  totalMtCO2e: number;
}

export type ByCommodity = Partial<Record<Commodity, number>>;

/** public/data/entities.json — one summary per entity. */
export interface EntitySummary {
  slug: string;
  name: string;
  type: EntityType;
  firstYear: number;
  lastYear: number;
  cumulativeMtCO2e: number;
  rankCumulative: number;
  commodities: Commodity[];
  country?: string | null; // ISO 3166-1 alpha-2 of the producer's home country, from data/entity-meta.json
  logo?: string | null; // filename in public/logos/, when one was downloaded
}

/** public/data/entities/{slug}.json — full history for a company page. */
export interface EntityDetail extends EntitySummary {
  series: { year: number; totalMtCO2e: number; byCommodity: ByCommodity }[];
}

/** One row in public/data/leaderboard/{year}.json */
export interface LeaderboardRow {
  slug: string;
  name: string;
  type: EntityType;
  annualMtCO2e: number;
  annualByCommodity: ByCommodity;
  cumulativeMtCO2e: number; // through this year
  cumulativeByCommodity: ByCommodity;
  sparkline: number[]; // last N annual totals, oldest first
  country?: string | null;
  logo?: string | null;
}

export interface LeaderboardYear {
  year: number;
  totalAnnualMtCO2e: number; // sum across all Carbon Majors entities
  totalCumulativeMtCO2e: number;
  rows: LeaderboardRow[];
}

/** public/data/footprints.json — per-capita figures from OWID. */
export interface CountryFootprint {
  iso3: string;
  name: string;
  year: number;
  co2PerCapitaT: number | null; // territorial CO2, tonnes/person
  consumptionCo2PerCapitaT: number | null; // trade-adjusted CO2
  ghgPerCapitaT: number | null; // all GHGs, CO2e — best match for Carbon Majors units
}

/** One country's emissions for the map year (public/data/countries.json). */
export interface CountryEmissions {
  iso3: string;
  name: string;
  population: number | null;
  co2Mt: number; // territorial fossil + cement CO2, million tonnes
  co2PerCapitaT: number | null;
}

export interface CountriesYear {
  year: number; // one common year so countries are comparable
  rows: CountryEmissions[]; // sorted by co2Mt, descending
}

export interface Concentration {
  year: number;
  entitiesForHalf: number; // how many entities make up >= 50% of the denominator
  denominator: 'owid_world_co2' | 'carbon_majors_total';
  denominatorMt: number;
  caveat: string;
}

/** public/data/meta.json */
export interface Meta {
  dataSource: 'real' | 'sample';
  builtAt: string;
  sources: { id: string; file: string; license: string; isSample: boolean; note?: string }[];
  years: number[]; // years with leaderboard files, ascending
  latestYear: number;
  entityCount: number;
  concentration: Concentration;
}
