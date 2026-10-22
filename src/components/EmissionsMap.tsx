import { Paper, SegmentedControl, Table } from '@mantine/core';
import { useMemo, useState } from 'react';
import type { CountryEmissions } from '../../pipeline/types.ts';
import type { MapShape } from '../lib/map.ts';
import { MAP_HEIGHT, MAP_WIDTH } from '../lib/map.ts';
import MantineRoot from './MantineRoot';
import './EmissionsMap.css';

type Metric = 'total' | 'perCapita';

type MapRow = CountryEmissions & { flag: string };

interface Props {
  shapes: MapShape[];
  rows: MapRow[];
  year: number;
}

// Emissions are heavily skewed (China is ~1,000× a small country), so colour is binned on a
// roughly logarithmic scale rather than stretched linearly, which would paint everything but
// the top three countries the same pale colour. Lower bounds, ascending.
const BINS: Record<Metric, number[]> = {
  total: [0, 1, 10, 100, 500, 2000],
  perCapita: [0, 0.5, 2, 5, 10, 20],
};
const UNITS: Record<Metric, string> = { total: 'Mt CO₂', perCapita: 't CO₂ per person' };
const LABELS: Record<Metric, string> = { total: 'Total emissions', perCapita: 'Per person' };

const value = (r: MapRow, m: Metric) => (m === 'total' ? r.co2Mt : r.co2PerCapitaT);

function binIndex(v: number, m: Metric): number {
  const bins = BINS[m];
  let i = 0;
  while (i + 1 < bins.length && v >= bins[i + 1]) i++;
  return i;
}

function format(v: number, m: Metric): string {
  if (m === 'perCapita') return v.toFixed(1);
  if (v >= 100) return Math.round(v).toLocaleString('en-US');
  return v >= 10 ? v.toFixed(0) : v.toFixed(1);
}

function binLabel(i: number, m: Metric): string {
  const bins = BINS[m];
  const lo = bins[i];
  const hi = bins[i + 1];
  const fmt = (n: number) => n.toLocaleString('en-US');
  if (hi === undefined) return `${fmt(lo)}+`;
  return lo === 0 ? `< ${fmt(hi)}` : `${fmt(lo)}–${fmt(hi)}`;
}

function EmissionsMapInner({ shapes, rows, year }: Props) {
  const [metric, setMetric] = useState<Metric>('total');
  const [active, setActive] = useState<string | null>(null);

  const byIso = useMemo(() => new Map(rows.map((r) => [r.iso3, r])), [rows]);
  const ranked = useMemo(
    () =>
      rows
        .filter((r) => value(r, metric) !== null)
        .sort((a, b) => (value(b, metric) as number) - (value(a, metric) as number)),
    [rows, metric],
  );
  const shown = active ? byIso.get(active) : undefined;

  return (
    <div className="emap">
      <SegmentedControl
        mb="md"
        aria-label="Map measure"
        data={(Object.keys(LABELS) as Metric[]).map((m) => ({ value: m, label: LABELS[m] }))}
        value={metric}
        onChange={(v) => setMetric(v as Metric)}
      />

      <div className="emap-stage">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="img"
          aria-label={`World map shaded by ${LABELS[metric].toLowerCase()} CO₂ emissions in ${year}. A ranked table follows.`}
        >
          {shapes.map((s, i) => {
            const r = s.iso3 ? byIso.get(s.iso3) : undefined;
            const v = r ? value(r, metric) : null;
            const hasData = r !== undefined && v !== null;
            return (
              <path
                key={`${s.iso3 ?? s.name}-${i}`}
                d={s.d}
                className={`emap-country${hasData ? '' : ' no-data'}${r && active === r.iso3 ? ' is-active' : ''}`}
                data-bin={hasData ? binIndex(v, metric) : undefined}
                onPointerEnter={() => r && setActive(r.iso3)}
                onPointerLeave={() => setActive(null)}
              />
            );
          })}
        </svg>

        <Paper withBorder shadow="sm" radius="md" px="sm" py={8} className="emap-readout" aria-live="polite">
          {shown ? (
            <>
              <strong className="num">
                {value(shown, metric) === null ? 'No data' : format(value(shown, metric) as number, metric)}
              </strong>{' '}
              <span>{UNITS[metric]}</span>
              <div className="emap-name">
                <span aria-hidden="true">{shown.flag}</span> {shown.name}, {year}
              </div>
            </>
          ) : (
            <span className="emap-hint">Hover a country, or use the table below.</span>
          )}
        </Paper>
      </div>

      <ul className="emap-legend" aria-label={`Colour scale, ${UNITS[metric]}`}>
        {BINS[metric].map((_, i) => (
          <li key={i}>
            <span className="swatch" data-bin={i} aria-hidden="true" />
            {binLabel(i, metric)}
          </li>
        ))}
        <li>
          <span className="swatch no-data" aria-hidden="true" />
          No data
        </li>
      </ul>
      <p className="emap-unit">Colour shows {UNITS[metric]}, {year}. Shades step up roughly tenfold, not evenly.</p>

      <details className="emap-table">
        <summary>Show the 15 highest-emitting countries as a table</summary>
        <Table verticalSpacing="xs" highlightOnHover mt="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">#</Table.Th>
              <Table.Th scope="col">Country</Table.Th>
              <Table.Th scope="col" ta="right">
                {UNITS[metric]}
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ranked.slice(0, 15).map((r, i) => (
              <Table.Tr key={r.iso3} onPointerEnter={() => setActive(r.iso3)} onPointerLeave={() => setActive(null)}>
                <Table.Td>{i + 1}</Table.Td>
                <Table.Th scope="row" fw={400}>
                  <span aria-hidden="true">{r.flag}</span> {r.name}
                </Table.Th>
                <Table.Td ta="right" className="num">
                  {format(value(r, metric) as number, metric)}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </details>
    </div>
  );
}

export default function EmissionsMap(props: Props) {
  return (
    <MantineRoot>
      <EmissionsMapInner {...props} />
    </MantineRoot>
  );
}
