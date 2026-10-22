import { flagFromIso2 } from '../lib/format.ts';
import './EntityLabel.css';

interface Props {
  name: string;
  logo?: string | null;
  country?: string | null;
  /** Wraps the name in a link when set. */
  href?: string;
  /** Prefix for asset URLs (the leaderboard island is mounted under Astro's base). */
  base?: string;
}

/** Producer name with its logo before it and home-country flag after it. Both are decorative. */
export default function EntityLabel({ name, logo, country, href, base = '' }: Props) {
  const flag = flagFromIso2(country);
  return (
    <span className="entity-label">
      <span className="entity-logo" aria-hidden="true">
        {logo && <img src={`${base}/logos/${logo}`} alt="" width={20} height={20} loading="lazy" decoding="async" />}
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
