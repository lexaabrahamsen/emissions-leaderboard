// Build-time data access for .astro pages. Reads the JSON the pipeline wrote to public/data/.
// Client components fetch the same files over HTTP instead (see Leaderboard.tsx).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CountriesYear, EntityDetail, EntitySummary, LeaderboardYear, Meta } from '../../pipeline/types.ts';

const DATA_DIR = join(process.cwd(), 'public/data');

function read<T>(file: string): T {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8')) as T;
  } catch (err) {
    throw new Error(`Could not read public/data/${file}. Run \`pnpm data\` first.\n${String(err)}`);
  }
}

export const loadMeta = () => read<Meta>('meta.json');
export const loadEntities = () => read<EntitySummary[]>('entities.json');
export const loadEntity = (slug: string) => read<EntityDetail>(`entities/${slug}.json`);
export const loadLeaderboard = (year: number) => read<LeaderboardYear>(`leaderboard/${year}.json`);
export const loadCountries = (): CountriesYear | null => {
  try {
    return read<CountriesYear>('countries.json');
  } catch {
    return null;
  }
};
