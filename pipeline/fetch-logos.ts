// Downloads a small icon for each producer in data/entity-meta.json into public/logos/.
// Run manually: node pipeline/fetch-logos.ts   (not part of `pnpm data`; needs network)
//
// Icons come from Google's favicon service, so they are small (≤64px) and some sites have none.
// public/logos/ is gitignored: these are third-party trademarks, so they are not redistributed
// in the repo. The site simply omits a logo when the file is missing.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public/logos');
const meta: Record<string, { country: string | null; domain: string | null }> = JSON.parse(
  readFileSync(join(ROOT, 'data/entity-meta.json'), 'utf8'),
);

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/x-icon': 'ico', 'image/svg+xml': 'svg' };

// fallback_opts makes the service answer 404 (rather than a generic globe) when a site has no icon.
const url = (domain: string) =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`;

async function fetchIcon(domain: string): Promise<{ bytes: Buffer; ext: string } | null> {
  for (const d of [domain, `www.${domain}`]) {
    const res = await fetch(url(d));
    if (!res.ok) continue;
    const ext = EXT[(res.headers.get('content-type') ?? '').split(';')[0]];
    if (ext) return { bytes: Buffer.from(await res.arrayBuffer()), ext };
  }
  return null;
}

mkdirSync(OUT, { recursive: true });
const manifest: Record<string, string> = {};
const missed: string[] = [];

for (const [slug, m] of Object.entries(meta)) {
  if (!m.domain) continue;
  const icon = await fetchIcon(m.domain);
  if (!icon) {
    missed.push(`${slug} (${m.domain})`);
    continue;
  }
  const file = `${slug}.${icon.ext}`;
  writeFileSync(join(OUT, file), icon.bytes);
  manifest[slug] = file;
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`✔ ${Object.keys(manifest).length} logos saved to public/logos/`);
if (missed.length) console.log(`✖ no icon found for ${missed.length}: ${missed.join(', ')}`);
