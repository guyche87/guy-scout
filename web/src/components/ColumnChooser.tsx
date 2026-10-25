// Column chooser popover (docs/ui-design.md "column-chooser"): presets, search, groups with All/None,
// changes apply live.
import { useMemo, useState } from 'react';
import { matchesWords } from '../lib/text.ts';
import { Checkbox } from './Inputs.tsx';
import { Popover } from './Popover.tsx';

export interface ChooserColumn {
  key: string;
  label: string;
  group: string;
}

interface ColumnChooserProps {
  columns: readonly ChooserColumn[];
  groups: readonly string[];
  value: readonly string[];
  onChange: (keys: string[]) => void;
  presets?: readonly { id: string; label: string; columns: readonly string[] }[];
  defaultColumns: readonly string[];
  /** Keys that cannot be hidden (e.g. name). */
  locked?: readonly string[];
  /** Groups shown collapsed into a search-only list when large (roles). */
  searchOnlyGroups?: readonly string[];
}

export function ColumnChooser({ columns, groups, value, onChange, presets, defaultColumns, locked = ['name'], searchOnlyGroups = [] }: ColumnChooserProps) {
  const [query, setQuery] = useState('');
  const chosen = useMemo(() => new Set(value), [value]);
  const lockedSet = useMemo(() => new Set(locked), [locked]);

  const byGroup = useMemo(() => {
    const m = new Map<string, ChooserColumn[]>();
    for (const g of groups) m.set(g, []);
    for (const c of columns) {
      if (query && !matchesWords(`${c.label} ${c.key} ${c.group}`, query)) continue;
      m.get(c.group)?.push(c);
    }
    return m;
  }, [columns, groups, query]);

  const toggle = (key: string, on: boolean) => {
    if (lockedSet.has(key)) return;
    if (on) onChange(chosen.has(key) ? [...value] : [...value, key]);
    else onChange(value.filter(k => k !== key));
  };

  const setGroup = (cols: ChooserColumn[], on: boolean) => {
    if (on) {
      const add = cols.map(c => c.key).filter(k => !chosen.has(k));
      onChange([...value, ...add]);
    } else {
      const drop = new Set(cols.map(c => c.key).filter(k => !lockedSet.has(k)));
      onChange(value.filter(k => !drop.has(k)));
    }
  };

  return (
    <Popover
      label="Columns"
      kind="dialog"
      ariaLabel="Choose columns"
      buttonClassName="btn btn--secondary btn--sm"
      align="end"
      onOpen={() => setQuery('')}
    >
      {close => (
        <div className="column-chooser">
          <div className="column-chooser__header stack">
            <div className="search-box">
              <input
                className="input input--sm"
                type="search"
                aria-label="Find column"
                placeholder="Find column…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            {presets && presets.length > 0 && (
              <div className="cluster" role="group" aria-label="Column presets">
                {presets.map(p => (
                  <button key={p.id} type="button" className="btn btn--sm" onClick={() => onChange([...p.columns])}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="column-chooser__body">
            {groups.map(g => {
              const cols = byGroup.get(g) ?? [];
              if (!cols.length) return null;
              const hideList = searchOnlyGroups.includes(g) && !query;
              const selectedHere = cols.filter(c => chosen.has(c.key));
              const shown = hideList ? selectedHere : cols;
              const allOn = selectedHere.length === cols.length;
              return (
                <fieldset key={g} className="column-chooser__group">
                  <legend className="column-chooser__legend">
                    {g}
                    {!hideList && (
                      <button type="button" className="link-btn link-btn--muted" onClick={() => setGroup(cols, !allOn)}>
                        {allOn ? 'None' : 'All'}
                      </button>
                    )}
                  </legend>
                  {hideList && (
                    <p className="field__hint">
                      {cols.length} columns. Type in the search box to find one{selectedHere.length ? '; selected:' : '.'}
                    </p>
                  )}
                  {shown.length > 0 && (
                    <div className="column-chooser__list">
                      {shown.map(c => (
                        <Checkbox
                          key={c.key}
                          small
                          checked={chosen.has(c.key)}
                          disabled={lockedSet.has(c.key)}
                          onChange={on => toggle(c.key, on)}
                          title={c.label}
                        >
                          {c.label}
                        </Checkbox>
                      ))}
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>
          <div className="column-chooser__footer">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([...defaultColumns])}>
              Reset to default
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={close}>
              Done
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}
