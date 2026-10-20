// Build-time data pipeline. Run with `pnpm data` (runs automatically before dev/build).
//
// Reads raw downloads from data/raw/ when present, otherwise falls back to the synthetic
// sample files in data/sample/ so the site always builds. Emits JSON to public/data/.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildEntities, buildLeaderboards, concentration, toSummary } from './aggregate.ts';
import { parseCarbonMajors } from './carbon-majors.ts';
import { parseOwid } from './owid.ts';
import type { Meta } from './types.ts';
import { validateEmissions, validateFootprints } from './validate.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const RAW = join(ROOT, 'data/raw');
const SAMPLE = join(ROOT, 'data/sample');
const OUT = join(ROOT, 'public/data');

const FILES = {
  carbonMajors: { raw: 'carbon-majors-medium.csv', sample: 'carbon-majors-medium.sample.csv' },
  owid: { raw: 'owid-co2-data.csv', sample: 'owid-co2.sample.csv' },
};

function resolve(f: { raw: string; sample: string }): { path: string; isSample: boolean } {
  const raw = join(RAW, f.raw);
  if (existsSync(raw)) return { path: raw, isSample: false };
  return { path: join(SAMPLE, f.sample), isSample: true };
}

function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data));
}

function fail(label: string, errors: string[]): never {
  console.error(`\n✖ ${label}: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 25)) console.error(`  - ${e}`);
  if (errors.length > 25) console.error(`  …and ${errors.length - 25} more`);
  process.exit(1);
}

const cm = resolve(FILES.carbonMajors);
const owid = resolve(FILES.owid);
if (cm.isSample !== owid.isSample) {
  console.warn('⚠ Mixing real and sample data. Put both real files in data/raw/ for accurate output.');
}

const emissions = parseCarbonMajors(readFileSync(cm.path, 'utf8'));
const emissionErrors = validateEmissions(emissions);
if (emissionErrors.length) fail('Carbon Majors validation', emissionErrors);

const { footprints, worldCo2ByYear, countries } = parseOwid(readFileSync(owid.path, 'utf8'));
const footprintErrors = validateFootprints(footprints);
if (footprintErrors.length) fail('OWID validation', footprintErrors);

const entities = buildEntities(emissions);
const leaderboards = buildLeaderboards(entities);
const latest = leaderboards[leaderboards.length - 1];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'entities'), { recursive: true });
mkdirSync(join(OUT, 'leaderboard'), { recursive: true });

writeJson(join(OUT, 'entities.json'), entities.map(toSummary));
for (const e of entities) writeJson(join(OUT, 'entities', `${e.slug}.json`), e);
for (const lb of leaderboards) writeJson(join(OUT, 'leaderboard', `${lb.year}.json`), lb);
writeJson(join(OUT, 'footprints.json'), footprints);
if (countries) writeJson(join(OUT, 'countries.json'), countries);

const meta: Meta = {
  dataSource: cm.isSample || owid.isSample ? 'sample' : 'real',
  builtAt: new Date().toISOString(),
  sources: [
    {
      id: 'carbon_majors',
      file: cm.path.replace(ROOT, ''),
      isSample: cm.isSample,
      license: 'InfluenceMap Carbon Majors — non-commercial use, see carbonmajors.org terms',
    },
    {
      id: 'owid',
      file: owid.path.replace(ROOT, ''),
      isSample: owid.isSample,
      license: 'CC BY 4.0 (Our World in Data); underlying Global Carbon Project data under its own terms',
    },
  ],
  years: leaderboards.map((l) => l.year),
  latestYear: latest.year,
  entityCount: entities.length,
  concentration: concentration(latest, worldCo2ByYear.get(latest.year)),
};
writeJson(join(OUT, 'meta.json'), meta);

const c = meta.concentration;
console.log(
  [
    `✔ Data built from ${meta.dataSource.toUpperCase()} files`,
    `  ${emissions.length.toLocaleString()} emission rows → ${entities.length} entities, ${leaderboards.length} years (${meta.years[0]}–${latest.year})`,
    `  ${footprints.length} country footprints; map year ${countries?.year ?? 'n/a'} (${countries?.rows.length ?? 0} countries)`,
    `  ${latest.year}: ${c.entitiesForHalf} entities ≈ 50% of ${c.denominator} (${c.denominatorMt.toLocaleString()} Mt)`,
  ].join('\n'),
);
