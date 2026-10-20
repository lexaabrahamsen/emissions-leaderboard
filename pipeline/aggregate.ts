import type {
  ByCommodity,
  Commodity,
  Concentration,
  EmissionRow,
  EntityDetail,
  EntitySummary,
  LeaderboardRow,
  LeaderboardYear,
} from './types.ts';

const SPARKLINE_YEARS = 20;

const round = (n: number, dp = 3) => Math.round(n * 10 ** dp) / 10 ** dp;

function addTo(target: ByCommodity, c: Commodity, v: number) {
  target[c] = (target[c] ?? 0) + v;
}

function roundBy(b: ByCommodity): ByCommodity {
  const out: ByCommodity = {};
  for (const [k, v] of Object.entries(b)) out[k as Commodity] = round(v);
  return out;
}

interface EntityAcc {
  name: string;
  type: EntitySummary['type'];
  byYear: Map<number, ByCommodity>;
}

function groupByEntity(rows: EmissionRow[]): Map<string, EntityAcc> {
  const map = new Map<string, EntityAcc>();
  for (const r of rows) {
    let e = map.get(r.slug);
    if (!e) {
      e = { name: r.entity, type: r.entityType, byYear: new Map() };
      map.set(r.slug, e);
    } else if (e.name !== r.entity) {
      throw new Error(`Slug collision: "${e.name}" and "${r.entity}" both map to "${r.slug}"`);
    }
    const yr = e.byYear.get(r.year) ?? {};
    addTo(yr, r.commodity, r.totalMtCO2e);
    e.byYear.set(r.year, yr);
  }
  return map;
}

const sum = (b: ByCommodity) => Object.values(b).reduce((a, v) => a + (v ?? 0), 0);

export function buildEntities(rows: EmissionRow[]): EntityDetail[] {
  const grouped = groupByEntity(rows);
  const details: EntityDetail[] = [];

  for (const [slug, e] of grouped) {
    const years = [...e.byYear.keys()].sort((a, b) => a - b);
    const series = years.map((year) => {
      const byCommodity = e.byYear.get(year)!;
      return { year, totalMtCO2e: round(sum(byCommodity)), byCommodity: roundBy(byCommodity) };
    });
    const commodities = new Set<Commodity>();
    for (const s of series) for (const c of Object.keys(s.byCommodity)) commodities.add(c as Commodity);

    details.push({
      slug,
      name: e.name,
      type: e.type,
      firstYear: years[0],
      lastYear: years[years.length - 1],
      cumulativeMtCO2e: round(series.reduce((a, s) => a + s.totalMtCO2e, 0)),
      rankCumulative: 0,
      commodities: [...commodities].sort(),
      series,
    });
  }

  details.sort((a, b) => b.cumulativeMtCO2e - a.cumulativeMtCO2e);
  details.forEach((d, i) => (d.rankCumulative = i + 1));
  return details;
}

export function toSummary(d: EntityDetail): EntitySummary {
  const { series: _series, ...summary } = d;
  return summary;
}

/** One leaderboard per year. Only entities active that year appear in its annual ranking,
 *  but cumulative totals run through that year. */
export function buildLeaderboards(entities: EntityDetail[]): LeaderboardYear[] {
  const allYears = new Set<number>();
  for (const e of entities) for (const s of e.series) allYears.add(s.year);
  const years = [...allYears].sort((a, b) => a - b);

  // Running cumulative per entity, walked forward year by year.
  const running = new Map<string, { total: number; byCommodity: ByCommodity }>();
  const seriesIndex = new Map(entities.map((e) => [e.slug, new Map(e.series.map((s) => [s.year, s]))]));
  const out: LeaderboardYear[] = [];

  for (const year of years) {
    const rows: LeaderboardRow[] = [];
    for (const e of entities) {
      const point = seriesIndex.get(e.slug)!.get(year);
      const acc = running.get(e.slug) ?? { total: 0, byCommodity: {} };
      if (point) {
        acc.total += point.totalMtCO2e;
        for (const [c, v] of Object.entries(point.byCommodity)) addTo(acc.byCommodity, c as Commodity, v ?? 0);
        running.set(e.slug, acc);
      }
      // Not started yet: skip. Stopped earlier: keep with zero annual emissions, so the
      // cumulative view still counts historical producers (e.g. defunct or merged entities).
      if (!running.has(e.slug)) continue;

      const spark = e.series
        .filter((s) => s.year <= year && s.year > year - SPARKLINE_YEARS)
        .map((s) => s.totalMtCO2e);

      rows.push({
        slug: e.slug,
        name: e.name,
        type: e.type,
        annualMtCO2e: point?.totalMtCO2e ?? 0,
        annualByCommodity: point?.byCommodity ?? {},
        cumulativeMtCO2e: round(acc.total),
        cumulativeByCommodity: roundBy(acc.byCommodity),
        sparkline: spark,
      });
    }
    rows.sort((a, b) => b.annualMtCO2e - a.annualMtCO2e);
    out.push({
      year,
      totalAnnualMtCO2e: round(rows.reduce((a, r) => a + r.annualMtCO2e, 0)),
      totalCumulativeMtCO2e: round([...running.values()].reduce((a, r) => a + r.total, 0)),
      rows,
    });
  }
  return out;
}

/** How many entities, largest first, account for half of the denominator in a given year. */
export function concentration(lb: LeaderboardYear, worldCo2Mt: number | undefined): Concentration {
  const useOwid = worldCo2Mt !== undefined && worldCo2Mt > 0;
  const denominatorMt = useOwid ? worldCo2Mt : lb.totalAnnualMtCO2e;
  let acc = 0;
  let n = 0;
  for (const r of lb.rows) {
    acc += r.annualMtCO2e;
    n++;
    if (acc >= denominatorMt / 2) break;
  }
  const reached = acc >= denominatorMt / 2;
  return {
    year: lb.year,
    entitiesForHalf: reached ? n : -1,
    denominator: useOwid ? 'owid_world_co2' : 'carbon_majors_total',
    denominatorMt: round(denominatorMt),
    caveat: useOwid
      ? 'Numerator is Carbon Majors CO2e; denominator is OWID global fossil + industry CO2. InfluenceMap publishes its own CO2-only figure; prefer citing theirs in copy.'
      : 'Denominator is the Carbon Majors total, not global emissions. Add OWID data for a share-of-global figure.',
  };
}
