// Build-time world geometry for the emissions map. Runs in .astro frontmatter, so the client
// receives plain SVG path strings and ships no projection or topology code.

import { geoNaturalEarth1, geoPath } from 'd3-geo';
import countries from 'i18n-iso-countries';
import type { Topology } from 'topojson-specification';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 480;

export interface MapShape {
  iso3: string | null; // null for shapes Natural Earth ships without an ISO numeric id (e.g. Kosovo)
  name: string;
  d: string;
}

export function buildMapShapes(): MapShape[] {
  const topo = world as unknown as Topology;
  const fc = feature(topo, topo.objects.countries as never) as unknown as GeoJSON.FeatureCollection;
  // Antarctica has no national emissions and eats a fifth of the canvas.
  const features = fc.features.filter((f) => f.id !== '010');
  const projection = geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], { type: 'FeatureCollection', features });
  const path = geoPath(projection);

  return features.flatMap((f) => {
    const d = path(f);
    if (!d) return [];
    return [
      {
        iso3: f.id !== undefined ? (countries.numericToAlpha3(String(f.id)) ?? null) : null,
        name: String((f.properties as { name?: string } | null)?.name ?? ''),
        d,
      },
    ];
  });
}
