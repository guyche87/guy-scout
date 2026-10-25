// Type-ahead multi-select (ARIA combobox + listbox). Selected values show as removable chips above the input.
import { memo, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { fold } from '../lib/text.ts';

export interface Option {
  value: string;
  label?: string;
  /** Right-aligned extra text, e.g. a player count. */
  meta?: string;
  /** Extra text matched by the type-ahead (e.g. the league's nation). */
  keywords?: string;
}

interface MultiSelectProps {
  label: string;
  options: readonly Option[];
  value: readonly string[] | undefined;
  onChange: (v: string[]) => void;
  placeholder?: string;
  /** Max options rendered at once (type to narrow down). */
  limit?: number;
  hint?: string;
}

export const MultiSelect = memo(function MultiSelect({
  label, options, value, onChange, placeholder = 'Type to search…', limit = 80, hint,
}: MultiSelectProps) {
  const id = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = useMemo(() => new Set(value ?? []), [value]);

  const folded = useMemo(
    () => options.map(o => fold(`${o.label ?? o.value} ${o.keywords ?? ''}`)),
    [options],
  );

  const matches = useMemo(() => {
    const words = fold(text).split(/\s+/).filter(Boolean);
    const out: Option[] = [];
    for (let i = 0; i < options.length && out.length < limit; i++) {
      if (words.every(w => folded[i].includes(w))) out.push(options[i]);
    }
    return out;
  }, [text, options, folded, limit]);

  const toggle = (v: string) => {
    const cur = value ?? [];
    onChange(selected.has(v) ? cur.filter(x => x !== v) : [...cur, v]);
  };

  const listId = `${id}-list`;
  const optId = (i: number) => `${id}-opt-${i}`;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive(a => Math.min(matches.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      if (open && matches[active]) {
        e.preventDefault();
        toggle(matches[active].value);
      }
    } else if (e.key === 'Escape') {
      if (open || text) {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        setOpen(false);
        setText('');
      }
    } else if (e.key === 'Backspace' && !text && value && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const labelOf = (v: string) => options.find(o => o.value === v)?.label ?? v;

  return (
    <div className="field">
      <div className="field__label">
        <label htmlFor={`${id}-input`}>{label}</label>
        {value && value.length > 0 && (
          <button
            type="button"
            className="link-btn link-btn--muted field__aside"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => onChange([])}
          >
            clear
          </button>
        )}
      </div>
      {value && value.length > 0 && (
        <ul className="cluster" aria-label={`Selected ${label.toLowerCase()}`}>
          {value.map(v => (
            <li key={v} className="chip chip--sm">
              <span className="chip__label">{labelOf(v)}</span>
              <button type="button" className="chip__remove" aria-label={`Remove ${labelOf(v)}`} onClick={() => toggle(v)} />
            </li>
          ))}
        </ul>
      )}
      <div className="combobox">
        <input
          ref={inputRef}
          id={`${id}-input`}
          className="input input--sm"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? optId(active) : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={e => {
            setText(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul className="listbox" role="listbox" id={listId} aria-multiselectable="true" aria-label={label}>
            {matches.length === 0 && <li className="listbox__empty" role="presentation">No matches</li>}
            {matches.map((o, i) => (
              <li
                key={o.value}
                id={optId(i)}
                role="option"
                className="listbox__option"
                aria-selected={selected.has(o.value)}
                data-active={i === active ? 'true' : undefined}
                onMouseDown={e => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => toggle(o.value)}
              >
                <span className="truncate">{o.label ?? o.value}</span>
                {o.meta && <span className="listbox__meta">{o.meta}</span>}
              </li>
            ))}
            {matches.length >= limit && (
              <li className="listbox__empty" role="presentation">Type to narrow down…</li>
            )}
          </ul>
        )}
      </div>
      {hint && <span className="field__hint" id={`${id}-hint`}>{hint}</span>}
    </div>
  );
});

/** Converts a plain string list to options. */
export function toOptions(values: readonly string[]): Option[] {
  return values.map(v => ({ value: v }));
}
