# Raw data

Put downloaded source files here with these exact names. When a file is present, `pnpm data`
uses it instead of the synthetic sample in `data/sample/`.

| File | Source | How to get it |
|---|---|---|
| `carbon-majors-medium.csv` | [carbonmajors.org/Downloads](https://carbonmajors.org/Downloads) | Download the **medium granularity** CSV (accept InfluenceMap's terms) and rename it. |
| `owid-co2-data.csv` | [github.com/owid/co2-data](https://github.com/owid/co2-data) | Download `owid-co2-data.csv`. Note the commit hash in the table below so numbers don't shift between builds. |

## Download log

Record each download so the methodology page can cite exact versions.

| File | Downloaded | Version / commit | Notes |
|---|---|---|---|
| carbon-majors-medium.csv | | | |
| owid-co2-data.csv | | | |

## Licensing

Carbon Majors data is licensed for non-commercial use under InfluenceMap's terms. This folder
is git-ignored by default. Check the terms before committing raw or derived Carbon Majors files
to a public repository, and attribute InfluenceMap on every page that shows its data.
