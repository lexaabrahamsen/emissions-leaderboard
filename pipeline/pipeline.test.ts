import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEntities, buildLeaderboards, concentration } from './aggregate.ts';
import { mapCommodity, mapEntityType, parseCarbonMajors } from './carbon-majors.ts';
import { parseCsv } from './lib/csv.ts';
import { slugify } from './lib/slug.ts';
import { parseOwid } from './owid.ts';
import { validateEmissions } from './validate.ts';

const CM = `year,parent_entity,parent_type,commodity,production_value,production_unit,total_emissions_MtCO2e
2023,"Acme, Inc.",Investor-owned Company,Oil & NGL,10,Million bbl/yr,100
2023,"Acme, Inc.",Investor-owned Company,Natural Gas,5,Bcf/yr,50
2024,"Acme, Inc.",Investor-owned Company,Oil & NGL,11,Million bbl/yr,110
2023,State Co,State-owned Entity,Thermal Coal,20,Million tonnes/yr,40
2024,State Co,State-owned Entity,Thermal Coal,22,Million tonnes/yr,300
2024,Nationland (Cement),Nation State,Cement,,Million Tonnes CO2,10
`;

test('csv: quoted commas, escaped quotes, CRLF, BOM', () => {
  const rows = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n');
  assert.deepEqual(rows, [{ a: 'x, y', b: 'say "hi"' }]);
});

test('slugify', () => {
  assert.equal(slugify('Acme, Inc.'), 'acme-inc');
  assert.equal(slugify('Oil & Gas Ltd'), 'oil-and-gas-ltd');
  assert.equal(slugify('Pétróleos'), 'petroleos');
});

test('type and commodity mapping', () => {
  assert.equal(mapEntityType('Investor-owned Company'), 'investor-owned');
  assert.equal(mapEntityType('State-owned Entity'), 'state-owned');
  assert.equal(mapEntityType('Nation State'), 'nation-state');
  assert.equal(mapCommodity('Lignite Coal'), 'coal');
  assert.equal(mapCommodity('Oil & NGL'), 'oil_ngl');
  assert.equal(mapCommodity('Natural Gas'), 'natural_gas');
  assert.throws(() => mapCommodity('Unobtainium'));
});

test('parse carbon majors handles empty production', () => {
  const rows = parseCarbonMajors(CM);
  assert.equal(rows.length, 6);
  assert.equal(rows[5].production, null);
  assert.equal(rows[0].slug, 'acme-inc');
});

test('parse carbon majors reports missing columns clearly', () => {
  assert.throws(() => parseCarbonMajors('year,foo\n2020,1\n'), /Missing column for "entity"/);
});

test('entities: cumulative totals and ranks', () => {
  const entities = buildEntities(parseCarbonMajors(CM));
  const acme = entities.find((e) => e.slug === 'acme-inc')!;
  assert.equal(acme.cumulativeMtCO2e, 260);
  assert.deepEqual(acme.commodities, ['natural_gas', 'oil_ngl']);
  const state = entities.find((e) => e.slug === 'state-co')!;
  assert.equal(state.rankCumulative, 1); // 340 > 260
  assert.equal(acme.rankCumulative, 2);
});

test('leaderboards: annual ranking and running cumulative', () => {
  const lbs = buildLeaderboards(buildEntities(parseCarbonMajors(CM)));
  assert.deepEqual(lbs.map((l) => l.year), [2023, 2024]);
  const y2023 = lbs[0];
  assert.equal(y2023.rows[0].slug, 'acme-inc'); // 150 > 40
  assert.equal(y2023.totalAnnualMtCO2e, 190);
  const y2024 = lbs[1];
  assert.equal(y2024.rows[0].slug, 'state-co'); // 300
  const acme = y2024.rows.find((r) => r.slug === 'acme-inc')!;
  assert.equal(acme.cumulativeMtCO2e, 260);
  assert.equal(acme.cumulativeByCommodity.oil_ngl, 210);
  assert.equal(y2024.totalCumulativeMtCO2e, 610);
  assert.ok(!y2023.rows.some((r) => r.slug === 'nationland-cement')); // not active in 2023
});

test('leaderboards: producers that stopped stay in cumulative view with zero annual', () => {
  const lbs = buildLeaderboards(
    buildEntities(parseCarbonMajors(CM + '2023,Defunct Coal Co,Investor-owned Company,Thermal Coal,1,x,500\n')),
  );
  const row2024 = lbs[1].rows.find((r) => r.slug === 'defunct-coal-co')!;
  assert.equal(row2024.annualMtCO2e, 0);
  assert.equal(row2024.cumulativeMtCO2e, 500);
  assert.equal(lbs[1].totalAnnualMtCO2e, 420); // unaffected by the defunct producer
});

test('concentration counts entities to reach half', () => {
  const lbs = buildLeaderboards(buildEntities(parseCarbonMajors(CM)));
  const y2024 = lbs[1]; // 300, 110, 10 → total 420
  assert.equal(concentration(y2024, undefined).entitiesForHalf, 1);
  assert.equal(concentration(y2024, undefined).denominator, 'carbon_majors_total');
  const withWorld = concentration(y2024, 1000); // need 500: 300+110+10 = 420 never reaches
  assert.equal(withWorld.entitiesForHalf, -1);
  assert.equal(concentration(y2024, 700).entitiesForHalf, 2); // need 350: 300+110
});

test('validation catches duplicates and negatives', () => {
  const rows = parseCarbonMajors(CM + '2024,State Co,State-owned Entity,Thermal Coal,1,x,-5\n');
  const errors = validateEmissions(rows);
  assert.ok(errors.some((e) => e.startsWith('Duplicate row')));
  assert.ok(errors.some((e) => e.includes('negative')));
});

test('owid: keeps latest per-capita year, skips aggregates, reads World', () => {
  const { footprints, worldCo2ByYear } = parseOwid(
    `country,year,iso_code,population,co2,co2_per_capita,consumption_co2_per_capita,ghg_per_capita
Alpha,2022,ALP,10,1,1.5,,2
Alpha,2023,ALP,10,1,1.6,1.7,
Alpha,2024,ALP,10,1,,,
Europe,2023,,10,1,9,,
European Union (27),2023,OWID_EU27,10,1,7,,
World,2023,OWID_WRL,,37000,4.6,,
`,
  );
  assert.equal(footprints.length, 1);
  assert.equal(footprints[0].year, 2023);
  assert.equal(footprints[0].consumptionCo2PerCapitaT, 1.7);
  assert.equal(footprints[0].ghgPerCapitaT, null);
  assert.equal(worldCo2ByYear.get(2023), 37000);
});
