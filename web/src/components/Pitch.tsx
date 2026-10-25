// Position map on a pitch (POSITION_PITCH coordinates, docs/ui-design.md "pitch"). Display mode colours dots
// by familiarity (best first in DOM order); PositionPicker turns them into toggle buttons for the filter.
import { memo } from 'react';
import { POSITION_LABELS, POSITION_PITCH, POSITIONS, familiarityLabel, type PositionKey } from '../../../shared/attributes.ts';
import { cssVars, cx } from '../lib/css.ts';
import { familiarity, type Familiarity } from '../lib/tiers.ts';

const LEGEND: { kind: Familiarity; label: string; short: string }[] = [
  { kind: 'natural', label: 'Natural', short: 'N' },
  { kind: 'accomplished', label: 'Accomplished', short: 'A' },
  { kind: 'competent', label: 'Competent', short: 'C' },
  { kind: 'unconvincing', label: 'Unconvincing', short: 'U' },
  { kind: 'awkward', label: 'Awkward', short: 'W' },
];

interface PitchProps {
  positions: Partial<Record<PositionKey, number>>;
  size?: 'sm' | 'md' | 'lg';
  legend?: boolean;
  caption?: string;
}

export const Pitch = memo(function Pitch({ positions, size = 'md', legend = true, caption = 'Positions' }: PitchProps) {
  // Best first so screen readers hear the strongest positions first; ineffectual ones are left out.
  const shown = POSITIONS
    .map(p => ({ p, v: positions[p] ?? 0 }))
    .filter(x => familiarity(x.v) !== 'ineffectual')
    .sort((a, b) => b.v - a.v);
  return (
    <figure className="pitch-figure">
      <div className={cx('pitch', size === 'sm' && 'pitch--sm', size === 'lg' && 'pitch--lg')}>
        <ul className="pitch__dots" aria-label={caption}>
          {shown.map(({ p, v }) => {
            const xy = POSITION_PITCH[p];
            const text = `${POSITION_LABELS[p]}: ${familiarityLabel(v)}`;
            return (
              <li
                key={p}
                className="pitch__dot"
                data-fam={familiarity(v)}
                style={cssVars({ '--x': xy.x, '--y': xy.y })}
                title={`${text} (${v})`}
              >
                <span aria-hidden="true">{p}</span>
                <span className="visually-hidden">{`${text}, ${v} of 20`}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {legend && <PitchLegend />}
    </figure>
  );
});

export function PitchLegend() {
  return (
    <ul className="pitch-legend" aria-label="Familiarity legend">
      {LEGEND.map(l => (
        <li key={l.kind} className="pitch-legend__item">
          <span className="pitch__dot pitch__dot--static" data-fam={l.kind} aria-hidden="true">{l.short}</span>
          {l.label}
        </li>
      ))}
    </ul>
  );
}

interface PositionPickerProps {
  value: readonly PositionKey[] | undefined;
  onChange: (v: PositionKey[]) => void;
  label?: string;
}

/** Mini pitch of toggle buttons (aria-pressed). Selected = filled "natural" dot, unselected = hollow ring. */
export const PositionPicker = memo(function PositionPicker({ value, onChange, label = 'Positions' }: PositionPickerProps) {
  const sel = new Set(value ?? []);
  const toggle = (p: PositionKey) => {
    onChange(sel.has(p) ? (value ?? []).filter(x => x !== p) : [...(value ?? []), p]);
  };
  return (
    <div className="pitch-figure">
      <div className="pitch pitch--sm" role="group" aria-label={label}>
        <div className="pitch__dots">
          {POSITIONS.map(p => {
            const xy = POSITION_PITCH[p];
            const on = sel.has(p);
            return (
              <button
                key={p}
                type="button"
                className="pitch__dot"
                data-fam={on ? 'natural' : 'unconvincing'}
                aria-pressed={on}
                title={POSITION_LABELS[p]}
                style={cssVars({ '--x': xy.x, '--y': xy.y })}
                onClick={() => toggle(p)}
              >
                <span aria-hidden="true">{p}</span>
                <span className="visually-hidden">{POSITION_LABELS[p]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
