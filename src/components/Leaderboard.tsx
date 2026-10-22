import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Checkbox, Group, Input, Paper, Stack, SegmentedControl, Select, Table, Text, UnstyledButton } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconArrowsSort } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import {
  COMMODITIES,
  ENTITY_TYPES,
  type Commodity,
  type EntityType,
  type LeaderboardRow,
  type LeaderboardYear,
} from '../../pipeline/types.ts';
import { COMMODITY_LABEL, ENTITY_TYPE_LABEL, formatMt, formatPct } from '../lib/format';
import EntityLabel, { CountryCell } from './EntityLabel';
import MantineRoot from './MantineRoot';
import Sparkline from './Sparkline';
import './Leaderboard.css';

type Metric = 'annual' | 'cumulative';
type CommodityFilter = 'all' | Commodity;

interface Props {
  years: number[];
  defaultYear: number;
}

interface Row {
  logo: string | null;
  country: string | null;
  rank: number;
  slug: string;
  name: string;
  type: EntityType;
  value: number;
  share: number;
  sparkline: number[];
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function valueFor(r: LeaderboardRow, metric: Metric, commodity: CommodityFilter): number {
  if (metric === 'annual') return commodity === 'all' ? r.annualMtCO2e : (r.annualByCommodity[commodity] ?? 0);
  return commodity === 'all' ? r.cumulativeMtCO2e : (r.cumulativeByCommodity[commodity] ?? 0);
}

// --- URL state: every view is linkable -------------------------------------------------

interface ViewState {
  year: number;
  metric: Metric;
  commodity: CommodityFilter;
  types: EntityType[];
}

function readUrl(years: number[], fallback: ViewState): ViewState {
  const p = new URLSearchParams(window.location.search);
  const year = Number(p.get('year'));
  const metric = p.get('metric');
  const commodity = p.get('commodity');
  const types = p.get('types')?.split(',').filter((t): t is EntityType => (ENTITY_TYPES as readonly string[]).includes(t));
  return {
    year: years.includes(year) ? year : fallback.year,
    metric: metric === 'cumulative' ? 'cumulative' : 'annual',
    commodity: commodity && (COMMODITIES as readonly string[]).includes(commodity) ? (commodity as Commodity) : 'all',
    types: types && types.length ? types : fallback.types,
  };
}

function writeUrl(s: ViewState, defaults: ViewState) {
  const p = new URLSearchParams();
  if (s.year !== defaults.year) p.set('year', String(s.year));
  if (s.metric !== 'annual') p.set('metric', s.metric);
  if (s.commodity !== 'all') p.set('commodity', s.commodity);
  if (s.types.length !== ENTITY_TYPES.length) p.set('types', s.types.join(','));
  const qs = p.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

// --- Component ---------------------------------------------------------------------------

const col = createColumnHelper<Row>();

function LeaderboardInner({ years, defaultYear }: Props) {
  const defaults: ViewState = { year: defaultYear, metric: 'annual', commodity: 'all', types: [...ENTITY_TYPES] };
  const [view, setView] = useState<ViewState>(defaults);
  const [urlReady, setUrlReady] = useState(false);
  const [data, setData] = useState<LeaderboardYear | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'value', desc: true }]);

  // Read URL after mount so server and client render the same initial markup.
  useEffect(() => {
    setView(readUrl(years, defaults));
    setUrlReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (urlReady) writeUrl(view, defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, urlReady]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`${BASE}/data/leaderboard/${view.year}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<LeaderboardYear>;
      })
      .then((json) => !cancelled && setData(json))
      .catch((e) => !cancelled && setError(`Couldn't load ${view.year} data (${String(e)}).`));
    return () => {
      cancelled = true;
    };
  }, [view.year]);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    // Share is against all producers for the chosen metric + commodity, not just the
    // filtered types, so filtering never inflates a company's share.
    const total = data.rows.reduce((a, r) => a + valueFor(r, view.metric, view.commodity), 0);
    return data.rows
      .map((r) => ({ r, value: valueFor(r, view.metric, view.commodity) }))
      .filter(({ r, value }) => value > 0 && view.types.includes(r.type))
      .sort((a, b) => b.value - a.value)
      .map(({ r, value }, i) => ({
        rank: i + 1,
        slug: r.slug,
        name: r.name,
        logo: r.logo ?? null,
        country: r.country ?? null,
        type: r.type,
        value,
        share: total > 0 ? value / total : 0,
        sparkline: r.sparkline,
      }));
  }, [data, view.metric, view.commodity, view.types]);

  const maxShare = rows.reduce((m, r) => Math.max(m, r.share), 0) || 1;

  const columns = useMemo(
    () => [
      col.accessor('country', {
        header: 'Country',
        cell: (c) => <CountryCell country={c.getValue()} />,
        enableSorting: false,
      }),
      col.accessor('rank', { header: '#', cell: (c) => c.getValue(), enableSorting: false }),
      col.accessor('name', {
        header: 'Producer',
        cell: (c) => (
          <EntityLabel
            name={c.getValue()}
            logo={c.row.original.logo}
            country={c.row.original.country}
            showFlag={false}
            href={`${BASE}/companies/${c.row.original.slug}`}
            base={BASE}
          />
        ),
      }),
      col.accessor('type', { header: 'Ownership', cell: (c) => <span style={{ whiteSpace: 'nowrap' }}>{ENTITY_TYPE_LABEL[c.getValue()]}</span> }),
      col.accessor('value', {
        header: () => (view.metric === 'annual' ? `Emissions, ${view.year}` : `Cumulative through ${view.year}`),
        cell: (c) => <span className="num">{formatMt(c.getValue())}</span>,
        sortDescFirst: true,
      }),
      col.accessor('share', {
        header: 'Share of Carbon Majors total',
        cell: (c) => (
          <span className="share-cell">
            <span className="share-bar" style={{ width: `${(c.getValue() / maxShare) * 100}%` }} aria-hidden="true" />
            <span className="num">{formatPct(c.getValue())}</span>
          </span>
        ),
        sortDescFirst: true,
      }),
      col.display({
        id: 'trend',
        header: () => <span>Trend<span className="visually-hidden"> (last 20 years, annual)</span></span>,
        cell: (c) => <Sparkline values={c.row.original.sparkline} />,
      }),
    ],
    [view.metric, view.year, maxShare],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const update = (patch: Partial<ViewState>) => setView((v) => ({ ...v, ...patch }));
  return (
    <div className="leaderboard">
      <Paper withBorder p="md" radius="lg" component="form" onSubmit={(e: { preventDefault: () => void }) => e.preventDefault()}>
        <Group align="flex-end" gap="lg" wrap="wrap">
          <Select
            label="Year"
            w={110}
            data={[...years].reverse().map((y) => String(y))}
            value={String(view.year)}
            onChange={(v) => v && update({ year: Number(v) })}
            allowDeselect={false}
            checkIconPosition="right"
            maxDropdownHeight={280}
          />

          <Stack gap={4}>
            <Input.Label>Measure</Input.Label>
            <SegmentedControl
              data={[
                { label: 'That year', value: 'annual' },
                { label: 'Cumulative', value: 'cumulative' },
              ]}
              value={view.metric}
              onChange={(v) => update({ metric: v as Metric })}
              aria-label="Measure"
            />
          </Stack>

          <Select
            label="Commodity"
            w={200}
            data={[{ value: 'all', label: 'All commodities' }, ...COMMODITIES.map((c) => ({ value: c, label: COMMODITY_LABEL[c] }))]}
            value={view.commodity}
            onChange={(v) => v && update({ commodity: v as CommodityFilter })}
            allowDeselect={false}
            checkIconPosition="right"
          />

          <Checkbox.Group
            label="Ownership"
            value={view.types}
            // Never allow an empty selection.
            onChange={(v) => v.length && update({ types: v as EntityType[] })}
          >
            <Group gap="md" mih={36}>
              {ENTITY_TYPES.map((t) => (
                <Checkbox key={t} value={t} label={ENTITY_TYPE_LABEL[t]} />
              ))}
            </Group>
          </Checkbox.Group>
        </Group>
      </Paper>

      <Text size="sm" c="dimmed" mt="md" mb="xs" aria-live="polite">
        {error ?? (data ? `${rows.length} producers` : 'Loading…')}
      </Text>

      <Table.ScrollContainer minWidth={720}>
        <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover className="lb-table">
          <Table.Caption className="visually-hidden">
            Producers ranked by {view.metric === 'annual' ? `emissions in ${view.year}` : `cumulative emissions through ${view.year}`}
            {view.commodity !== 'all' ? `, ${COMMODITY_LABEL[view.commodity]} only` : ''}. Values in CO₂-equivalent.
          </Table.Caption>
          <Table.Thead>
            {table.getHeaderGroups().map((hg) => (
              <Table.Tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  return (
                    <Table.Th
                      key={h.id}
                      scope="col"
                      className={`col-${h.column.id}`}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                    >
                      {h.column.getCanSort() ? (
                        <UnstyledButton className="sort-btn" onClick={h.column.getToggleSortingHandler()}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <span aria-hidden="true" className="sort-icon">
                            {sorted === 'asc' ? <IconArrowUp size={14} /> : sorted === 'desc' ? <IconArrowDown size={14} /> : <IconArrowsSort size={14} />}
                          </span>
                        </UnstyledButton>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </Table.Th>
                  );
                })}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.map((r) => (
              <Table.Tr key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <Table.Td key={c.id} className={`col-${c.column.id}`}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </div>
  );
}

export default function Leaderboard(props: Props) {
  return (
    <MantineRoot>
      <LeaderboardInner {...props} />
    </MantineRoot>
  );
}
