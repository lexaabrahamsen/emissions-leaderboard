// Generates SYNTHETIC sample CSVs in data/sample/ so the site builds before you download
// the real data. Entity and country names are invented and every number is fake —
// never publish a build made from these files.
//
// Run: node pipeline/make-sample.ts

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(new URL('..', import.meta.url).pathname, 'data/sample');

// Deterministic PRNG so regenerating gives identical files.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);

const entities: [string, string, [string, string][]][] = [
  ['Sample Petroleum Co.', 'Investor-owned Company', [['Oil & NGL', 'Million bbl/yr'], ['Natural Gas', 'Bcf/yr']]],
  ['Example Energy Corp', 'Investor-owned Company', [['Oil & NGL', 'Million bbl/yr'], ['Natural Gas', 'Bcf/yr']]],
  ['Placeholder Resources', 'Investor-owned Company', [['Thermal Coal', 'Million tonnes/yr'], ['Metallurgical Coal', 'Million tonnes/yr']]],
  ['Mock Cement Group', 'Investor-owned Company', [['Cement', 'Million Tonnes CO2']]],
  ['Fictional Gas Ltd', 'Investor-owned Company', [['Natural Gas', 'Bcf/yr']]],
  ['Demo State Oil', 'State-owned Entity', [['Oil & NGL', 'Million bbl/yr'], ['Natural Gas', 'Bcf/yr']]],
  ['Test National Petroleum', 'State-owned Entity', [['Oil & NGL', 'Million bbl/yr']]],
  ['Sample Coal Authority', 'State-owned Entity', [['Thermal Coal', 'Million tonnes/yr'], ['Lignite Coal', 'Million tonnes/yr']]],
  ['Example Gas Monopoly', 'State-owned Entity', [['Natural Gas', 'Bcf/yr']]],
  ['Republic of Samplestan (Coal)', 'Nation State', [['Bituminous Coal', 'Million tonnes/yr']]],
  ['Federation of Examplia (Cement)', 'Nation State', [['Cement', 'Million Tonnes CO2']]],
  ['Mockland (Oil)', 'Nation State', [['Oil & NGL', 'Million bbl/yr']]],
];

const cm: string[] = ['year,parent_entity,parent_type,commodity,production_value,production_unit,total_emissions_MtCO2e'];
for (const [name, type, commodities] of entities) {
  const start = 1950 + Math.floor(rand() * 40);
  const scale = 20 + rand() * 400;
  for (let year = start; year <= 2024; year++) {
    for (const [commodity, unit] of commodities) {
      const growth = (year - start) / (2024 - start);
      const emissions = scale * (0.3 + growth) * (0.85 + rand() * 0.3);
      const production = emissions * (1.5 + rand());
      cm.push(`${year},"${name}",${type},${commodity},${production.toFixed(3)},${unit},${emissions.toFixed(4)}`);
    }
  }
}
writeFileSync(join(OUT, 'carbon-majors-medium.sample.csv'), cm.join('\n') + '\n');

const countries: [string, string, number][] = [
  ['Samplestan', 'SMP', 14],
  ['Examplia', 'EXA', 8],
  ['Mockland', 'MCK', 5],
  ['Testonia', 'TST', 2],
  ['Placeholder Highlands', 'PLH', 0.6],
];
const owid: string[] = ['country,year,iso_code,population,co2,co2_per_capita,consumption_co2_per_capita,ghg_per_capita'];
for (let year = 2015; year <= 2024; year++) {
  let world = 0;
  for (const [name, iso, base] of countries) {
    const pc = base * (0.95 + rand() * 0.1);
    const pop = 10_000_000 + Math.floor(rand() * 300_000_000);
    const co2 = (pc * pop) / 1e6;
    world += co2;
    owid.push(`${name},${year},${iso},${pop},${co2.toFixed(3)},${pc.toFixed(3)},${(pc * 1.1).toFixed(3)},${(pc * 1.3).toFixed(3)}`);
  }
  // A fake "World" sized so the concentration stat is meaningful against sample entities.
  owid.push(`World,${year},OWID_WRL,,${(world * 1.8).toFixed(3)},,,`);
}
writeFileSync(join(OUT, 'owid-co2.sample.csv'), owid.join('\n') + '\n');

console.log(`Wrote ${cm.length - 1} Carbon Majors rows and ${owid.length - 1} OWID rows to data/sample/`);
