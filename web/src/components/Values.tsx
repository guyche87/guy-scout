// Graded value tiles and bars (docs/ui-design.md section 9): .attr (1-20), .rating (0-100), .ability (CA/PA),
// .ability-bar, .ability-meter, .meter, .stars, .shortlist-star. Missing values render without data-tier as "–".
import { memo } from 'react';
import { cssVars, cx } from '../lib/css.ts';
import { abilityTier, abilityTierFor, attrTierFor, INVERTED_KEYS, ratingTierFor } from '../lib/tiers.ts';

interface AttrProps {
  value: number | null | undefined;
  /** Attribute key; inverts the tier for "lower is better" attributes (INVERTED_KEYS). */
  attrKey?: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  unverified?: boolean;
}

/** 1-20 attribute tile. */
export const AttrTile = memo(function AttrTile({ value, attrKey = '', size = 'md', title, unverified }: AttrProps) {
  const tier = attrTierFor(attrKey, value);
  const inverted = INVERTED_KEYS.has(attrKey);
  const tip = [title, unverified ? 'Memory offset not yet verified' : null, inverted && tier ? 'Lower is better' : null]
    .filter(Boolean).join(' · ') || undefined;
  return (
    <span
      className={cx('attr', size === 'sm' && 'attr--sm', size === 'lg' && 'attr--lg', unverified && 'is-unverified')}
      data-tier={tier}
      title={tip}
    >
      {tier === undefined ? '–' : Math.round(value as number)}
    </span>
  );
});

/** 0-100 rating tile (role, position or staff-role rating). Printed rounded so it matches the tier. */
export const RatingTile = memo(function RatingTile({ value, title, unit = false }: { value: number | null | undefined; title?: string; unit?: boolean }) {
  const tier = ratingTierFor(value);
  return (
    <span className="rating" data-tier={tier} title={title}>
      {tier === undefined ? '–' : Math.round(value as number)}
      {tier !== undefined && unit && <span className="rating__unit">%</span>}
    </span>
  );
});

/** CA or PA tile. */
export const AbilityTile = memo(function AbilityTile({ value, title }: { value: number | null | undefined; title?: string }) {
  const tier = abilityTierFor(value);
  return (
    <span className="ability" data-tier={tier} title={title}>
      {tier === undefined ? '–' : Math.round(value as number)}
    </span>
  );
});

/** CA solid fill over a hatched PA band. `labelled` gives it role="img"; otherwise aria-hidden. */
export const AbilityBar = memo(function AbilityBar({
  ca, pa, size = 'md', labelled = false, className,
}: { ca: number; pa: number; size?: 'sm' | 'md' | 'lg'; labelled?: boolean; className?: string }) {
  return (
    <span
      className={cx('ability-bar', size === 'sm' && 'ability-bar--sm', size === 'lg' && 'ability-bar--lg', className)}
      style={cssVars({ '--ca': Math.max(0, ca || 0), '--pa': Math.max(0, pa || 0) })}
      data-ca-tier={ca > 0 ? abilityTier(ca) : undefined}
      data-pa-tier={pa > 0 ? abilityTier(pa) : undefined}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? `Current ability ${ca}, potential ${pa} of 200` : undefined}
      aria-hidden={labelled ? undefined : true}
    />
  );
});

/** Labelled CA/PA block for profile headers and compare heads. */
export function AbilityMeter({ ca, pa }: { ca: number; pa: number }) {
  return (
    <div className="ability-meter">
      <div className="ability-meter__labels">
        <span>
          Current<span className="ability-meter__value">{ca || '–'}</span>
        </span>
        <span>
          Potential<span className="ability-meter__value">{pa || '–'}</span>
        </span>
      </div>
      <AbilityBar ca={ca} pa={pa} />
    </div>
  );
}

/** Generic 0-100 meter; put data-tier on it or an ancestor (e.g. the .meter-row). */
export function Meter({ value }: { value: number }) {
  return (
    <span
      className="meter"
      style={cssVars({ '--value': Math.max(0, Math.min(100, Math.round(value || 0))) })}
      aria-hidden="true"
    />
  );
}

/** One label | meter | rating row of a .meter-list. */
export function MeterRow({ label, sub, value, best, title }: { label: string; sub?: string; value: number; best?: boolean; title?: string }) {
  return (
    <li className={cx('meter-row', best && 'is-best')} data-tier={ratingTierFor(value)} title={title}>
      <span className="meter-row__label">
        {label}
        {sub && <span className="meter-row__sub">{sub}</span>}
      </span>
      <Meter value={value} />
      <span className="rating">{Math.round(value)}</span>
    </li>
  );
}

/** 0-5 stars in half steps. */
export function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const v = Math.max(0, Math.min(5, Math.round((value || 0) * 2) / 2));
  return (
    <span
      className={cx('stars', size === 'sm' && 'stars--sm', size === 'lg' && 'stars--lg')}
      style={cssVars({ '--value': v })}
      role="img"
      aria-label={`${v} of 5 stars`}
      title={`${v} / 5`}
    />
  );
}

/** Shortlist star toggle; the label is constant, aria-pressed carries the state. */
export const ShortlistStar = memo(function ShortlistStar({
  on, name, onToggle, size = 'sm',
}: { on: boolean; name: string; onToggle: () => void; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      className={cx('shortlist-star', size === 'sm' && 'shortlist-star--sm')}
      aria-pressed={on}
      aria-label={`Shortlist ${name}`}
      title={on ? 'In the active shortlist (click to remove)' : 'Add to the active shortlist'}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
    />
  );
});
