import { useMemo, useState } from 'react';
import type { CountryEmissions } from '../../pipeline/types.ts';
import type { MapShape } from '../lib/map.ts';
import { MAP_HEIGHT, MAP_WIDTH } from '../lib/map.ts';
import './EmissionsMap.css';

type Metric = 'total' | 'perCapita';

interface Props {
  shapes: MapShape[];
  rows: CountryEmissions[];
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

const value = (r: CountryEmissions, m: Metric) => (m === 'total' ? r.co2Mt : r.co2PerCapitaT);

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

export default function EmissionsMap({ shapes, rows, year }: Props) {
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
      <div className="emap-controls" role="radiogroup" aria-label="Map measure">
        {(Object.keys(LABELS) as Metric[]).map((m) => (
          <label key={m} className={metric === m ? 'is-on' : ''}>
            <input type="radio" name="emap-metric" checked={metric === m} onChange={() => setMetric(m)} />
            {LABELS[m]}
          </label>
        ))}
      </div>

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

        <div className="emap-readout" aria-live="polite">
          {shown ? (
            <>
              <strong className="num">
                {value(shown, metric) === null ? 'No data' : format(value(shown, metric) as number, metric)}
              </strong>{' '}
              <span>{UNITS[metric]}</span>
              <div className="emap-name">
                {shown.name}, {year}
              </div>
            </>
          ) : (
            <span className="emap-hint">Hover a country, or use the table below.</span>
          )}
        </div>
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
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Country</th>
              <th scope="col" className="num">
                {UNITS[metric]}
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.slice(0, 15).map((r, i) => (
              <tr
                key={r.iso3}
                onPointerEnter={() => setActive(r.iso3)}
                onPointerLeave={() => setActive(null)}
              >
                <td>{i + 1}</td>
                <th scope="row">{r.name}</th>
                <td className="num">{format(value(r, metric) as number, metric)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
