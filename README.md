# Carbon Majors Leaderboard

A civic-tech data visualization: how concentrated global emissions are among a small set of
fossil fuel and cement producers, who causes the climate crisis, and who pays for it.

Static site (Astro + React islands) with a build-time data pipeline. No backend.

## Quick start

Requires Node 22.18+ (the pipeline runs TypeScript directly via Node's built-in type stripping)
and pnpm.

```bash
pnpm install
pnpm test     # pipeline unit tests
pnpm dev      # builds data, then starts the dev server at http://localhost:4321
```

Out of the box the site runs on **synthetic sample data** (invented names, fake numbers) and
shows a banner saying so. To use real data, follow `data/raw/README.md`.

## Scripts

| Script | What it does |
|---|---|
| `pnpm data` | Run the pipeline: `data/raw/` (or `data/sample/`) → `public/data/*.json` |
| `pnpm dev` / `pnpm build` | Run the pipeline, then Astro |
| `pnpm test` | Pipeline unit tests (`node:test`) |
| `pnpm check` | Astro + TypeScript type check |
| `pnpm data:sample` | Regenerate the synthetic sample CSVs |

## Structure

```
pipeline/            Build-time data pipeline (dependency-free TypeScript)
  types.ts           Shared types for pipeline output and the site
  carbon-majors.ts   Parse + normalize the Carbon Majors CSV
  owid.ts            Parse OWID per-capita and world totals
  aggregate.ts       Entities, per-year leaderboards, concentration stat
  validate.ts        Sanity checks that fail the build
  run.ts             Entry point: read → validate → aggregate → write JSON
data/
  raw/               Your downloads (git-ignored; see README inside)
  sample/            Synthetic data so the site always builds
public/data/         Generated JSON (git-ignored)
src/
  pages/             index, leaderboard, companies/[slug], methodology
  components/        React islands (Leaderboard, Sparkline)
  lib/               Build-time data loaders, formatters
  layouts/, styles/
```

## Data flow

The pipeline emits small, purpose-shaped JSON files:

- `meta.json`: data source, years, the concentration stat
- `entities.json`: one summary per producer (used for page generation)
- `entities/{slug}.json`: full history for each company page
- `leaderboard/{year}.json`: fetched by the leaderboard island when the year changes
- `footprints.json`: per-capita emissions by country (OWID)

Astro pages read these at build time; React islands fetch them over HTTP.

## Status

- Milestone 1 (pipeline): done for Carbon Majors + OWID. Climate TRACE, ND-GAIN and GLEIF to come.
- Milestone 2 (leaderboard): working first pass with filters, URL state, share bars, sparklines.
- Milestone 3 (company pages): stub with a server-rendered chart. visx stacked area to come.

The pipeline and its tests were run before handoff. The Astro build was not, because the
scaffolding environment had no npm access, so expect possible small fixes on first `pnpm dev`.

## Licensing and attribution

- Carbon Majors: InfluenceMap, non-commercial use. Check their terms before redistributing data.
- Our World in Data: CC BY 4.0; cite OWID and the Global Carbon Project.
