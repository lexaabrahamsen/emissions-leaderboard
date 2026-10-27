import { flagFromIso2 } from '../lib/format.ts';
import './EntityLabel.css';

interface Props {
  name: string;
  logo?: string | null;
  country?: string | null;
  /** Set false where the flag has its own column. */
  showFlag?: boolean;
  /** Wraps the name in a link when set. */
  href?: string;
  /** Prefix for asset URLs (the leaderboard island is mounted under Astro's base). */
  base?: string;
}

/** Up to two initials from the first words of a name, ignoring parentheses and years. */
function initials(name: string): string {
  const words = name.replace(/\(.*?\)/g, ' ').split(/[\s-]+/).filter((w) => /^[A-Za-z]/.test(w));
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

/** Producer name with its logo before it and home-country flag after it. Both are decorative.
 *  Producers without a logo get a neutral monogram chip so rows stay aligned and complete. */
export default function EntityLabel({ name, logo, country, showFlag = true, href, base = '' }: Props) {
  const flag = showFlag ? flagFromIso2(country) : '';
  return (
    <span className="entity-label">
      <span className="entity-logo" aria-hidden="true">
        {logo ? (
          <img src={`${base}/logos/${logo}`} alt="" width={20} height={20} loading="lazy" decoding="async" />
        ) : (
          <span className="entity-monogram">{initials(name)}</span>
        )}
      </span>
      {href ? <a href={href}>{name}</a> : <span>{name}</span>}
      {flag && (
        <span className="entity-flag" aria-hidden="true">
          {flag}
        </span>
      )}
    </span>
  );
}

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

/** A flag in its own table column. Shows a muted dash when there is no flag to show. */
export function CountryCell({ country }: { country?: string | null }) {
  const flag = flagFromIso2(country);
  if (!flag) {
    return (
      <span className="country-cell no-flag" title="No flag available">
        <span aria-hidden="true">—</span>
        <span className="visually-hidden">No flag available</span>
      </span>
    );
  }
  const name = (country && regionNames?.of(country)) || country || '';
  return (
    <span className="country-cell" title={name}>
      <span aria-hidden="true">{flag}</span>
      <span className="visually-hidden">{name}</span>
    </span>
  );
}
