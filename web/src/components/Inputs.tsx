// Small form controls: NumberInput, RangeInput, MoneyRangeInput, TriState, TextField, Checkbox.
import { useEffect, useId, useState, type ReactNode } from 'react';
import type { Range } from '../../../shared/api.ts';
import { cssVars, cx } from '../lib/css.ts';
import { moneyInputText, parseMoneyInput, type MoneyFormat } from '../lib/format.ts';

function parseNum(text: string): number | undefined {
  const t = text.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

interface NumberInputProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  small?: boolean;
  className?: string;
  title?: string;
}

/**
 * Number input that keeps the typed text locally (so "1" on the way to "15" is not reformatted). Values
 * inside [min, max] are reported as they are typed; out-of-range text is clamped and reported on blur.
 */
export function NumberInput({ value, onChange, min, max, step = 1, placeholder, ariaLabel, id, small = true, className, title }: NumberInputProps) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => {
    const parsed = parseNum(text);
    if (parsed !== value) setText(value === undefined ? '' : String(value));
    // Only react to external changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      className={cx('input', 'input--num', small && 'input--sm', className)}
      value={text}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      aria-label={ariaLabel}
      title={title}
      onChange={e => {
        const t = e.target.value;
        setText(t);
        const n = parseNum(t);
        if (n === undefined) onChange(undefined);
        else if (clamp(n) === n) onChange(n);
      }}
      onBlur={() => {
        const n = parseNum(text);
        if (n === undefined) {
          setText('');
          return;
        }
        const c = clamp(n);
        setText(String(c));
        if (c !== value) onChange(c);
      }}
    />
  );
}

interface RangeInputProps {
  label: string;
  value: Range | undefined;
  onChange: (r: Range | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholders?: [string, string];
}

function setRange(r: Range | undefined, bound: 'min' | 'max', v: number | undefined): Range | undefined {
  const next: Range = { ...r };
  if (v === undefined) delete next[bound];
  else next[bound] = v;
  return next.min === undefined && next.max === undefined ? undefined : next;
}

/** Min – max pair inside a labelled .field. */
export function RangeInput({ label, value, onChange, min, max, step, unit, placeholders }: RangeInputProps) {
  const id = useId();
  return (
    <div className="field" role="group" aria-labelledby={`${id}-l`}>
      <span className="field__label" id={`${id}-l`}>{label}</span>
      <div className="range">
        <NumberInput
          value={value?.min}
          onChange={v => onChange(setRange(value, 'min', v))}
          min={min}
          max={max}
          step={step}
          placeholder={placeholders?.[0] ?? 'min'}
          ariaLabel={`${label} minimum`}
        />
        <span className="range__sep" aria-hidden="true">–</span>
        <NumberInput
          value={value?.max}
          onChange={v => onChange(setRange(value, 'max', v))}
          min={min}
          max={max}
          step={step}
          placeholder={placeholders?.[1] ?? 'max'}
          ariaLabel={`${label} maximum`}
        />
        {unit && <span className="range__unit">{unit}</span>}
      </div>
    </div>
  );
}

interface MoneyInputProps {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  money: MoneyFormat;
  hint?: string;
  suffix?: string;
  placeholder?: string;
}

/** Money amount typed in display currency with K/M suffixes ("2.5M"); reports base currency. */
export function MoneyInput({ label, value, onChange, money, hint, suffix, placeholder = 'any' }: MoneyInputProps) {
  const id = useId();
  const [text, setText] = useState(moneyInputText(value, money));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (parseMoneyInput(text, money) !== value) {
      setText(moneyInputText(value, money));
      setInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, money]);

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {suffix && <span className="field__aside">{suffix}</span>}
      </label>
      <div className="range">
        <span className="range__unit" aria-hidden="true">{money.symbol}</span>
        <input
          id={id}
          className="input input--sm input--num"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={[hint ? `${id}-h` : '', invalid ? `${id}-e` : ''].filter(Boolean).join(' ') || undefined}
          onChange={e => {
            const t = e.target.value;
            setText(t);
            if (!t.trim()) {
              setInvalid(false);
              onChange(undefined);
              return;
            }
            const v = parseMoneyInput(t, money);
            setInvalid(v === undefined);
            if (v !== undefined) onChange(v);
          }}
        />
      </div>
      {hint && <span className="field__hint" id={`${id}-h`}>{hint}</span>}
      {invalid && <span className="field__error" id={`${id}-e`}>Use a number like 500K or 2.5M</span>}
    </div>
  );
}

interface TriStateProps {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean | undefined) => void;
  yes?: string;
  no?: string;
}

/** Any / Yes / No segmented control for optional boolean filters. */
export function TriState({ label, value, onChange, yes = 'Yes', no = 'No' }: TriStateProps) {
  const id = useId();
  const opts: { v: boolean | undefined; text: string }[] = [
    { v: undefined, text: 'Any' },
    { v: true, text: yes },
    { v: false, text: no },
  ];
  const cur = Math.max(0, opts.findIndex(o => o.v === value));
  return (
    <div className="field field--inline">
      <span className="field__label" id={id}>{label}</span>
      <div
        className="btn-group"
        role="radiogroup"
        aria-labelledby={id}
        onKeyDown={e => {
          const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          const n = (cur + d + opts.length) % opts.length;
          onChange(opts[n].v);
          const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('button');
          btns[n]?.focus();
        }}
      >
        {opts.map((o, i) => (
          <button
            key={o.text}
            type="button"
            role="radio"
            className="btn btn--sm"
            aria-checked={value === o.v}
            tabIndex={i === cur ? 0 : -1}
            onClick={() => onChange(o.v)}
          >
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SegmentedProps<V extends string> {
  label: string;
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (v: V) => void;
}

/** Single-choice segmented control (role="radiogroup", roving tabindex). */
export function Segmented<V extends string>({ label, value, options, onChange }: SegmentedProps<V>) {
  const cur = Math.max(0, options.findIndex(o => o.value === value));
  return (
    <div
      className="btn-group"
      role="radiogroup"
      aria-label={label}
      onKeyDown={e => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = (cur + d + options.length) % options.length;
        onChange(options[n].value);
        e.currentTarget.querySelectorAll<HTMLButtonElement>('button')[n]?.focus();
      }}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          className="btn btn--sm"
          aria-checked={o.value === value}
          tabIndex={i === cur ? 0 : -1}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  small?: boolean;
  block?: boolean;
  disabled?: boolean;
  title?: string;
  count?: ReactNode;
}

export function Checkbox({ checked, onChange, children, small, block, disabled, title, count }: CheckboxProps) {
  return (
    <label className={cx('checkbox', small && 'checkbox--sm', block && 'checkbox--block')} title={title}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="checkbox__text">{children}</span>
      {count !== undefined && <span className="checkbox__count">{count}</span>}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  search?: boolean;
  autoFocus?: boolean;
  inputId?: string;
  aside?: string;
}

export function TextField({ label, value, onChange, placeholder, search, autoFocus, inputId, aside }: TextFieldProps) {
  const autoId = useId();
  const id = inputId ?? autoId;
  const input = (
    <input
      id={id}
      className="input"
      type={search ? 'search' : 'text'}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      spellCheck={false}
      autoComplete="off"
      onChange={e => onChange(e.target.value)}
    />
  );
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {aside && <span className="field__aside">{aside}</span>}
      </label>
      {search ? <div className="search-box">{input}</div> : input}
    </div>
  );
}

interface MinGridProps<K extends string> {
  keys: readonly K[];
  labels: Record<K, string>;
  values: Partial<Record<K, number>> | undefined;
  onChange: (values: Partial<Record<K, number>>) => void;
  /** Keys whose bound is a maximum instead of a minimum. */
  maxKeys?: readonly string[];
  unverified?: readonly string[];
}

/** Compact grid of 1-20 minimum inputs (attribute / personality filters). */
export function MinGrid<K extends string>({ keys, labels, values, onChange, maxKeys = [], unverified = [] }: MinGridProps<K>) {
  const base = useId();
  const set = (k: K, v: number | undefined) => {
    const next = { ...values } as Record<string, number | undefined>;
    if (v === undefined || v <= 0) delete next[k];
    else next[k] = v;
    onChange(next as Partial<Record<K, number>>);
  };
  return (
    <div className="field-row" style={cssVars({ '--field-cols': 2, '--field-control-w': '48px' })}>
      {keys.map(k => {
        const id = `${base}-${k}`;
        const isMax = maxKeys.includes(k);
        const unv = unverified.includes(k);
        return (
          <div key={k} className="field field--inline">
            <label className="field__label" htmlFor={id} title={`${labels[k]}${isMax ? ' (maximum)' : ' (minimum)'}${unv ? ' - memory offset not yet verified' : ''}`}>
              <span className="truncate">{labels[k]}</span>
              {isMax && <span className="field__aside">≤</span>}
              {unv && <span className="field__aside" aria-label="unverified">?</span>}
            </label>
            <NumberInput
              id={id}
              value={values?.[k]}
              onChange={v => set(k, v)}
              min={1}
              max={20}
              placeholder="–"
            />
          </div>
        );
      })}
    </div>
  );
}

interface SelectFieldProps<V extends string> {
  label: string;
  value: V;
  onChange: (v: V) => void;
  children: ReactNode;
  inline?: boolean;
}

export function SelectField<V extends string>({ label, value, onChange, children, inline }: SelectFieldProps<V>) {
  const id = useId();
  return (
    <div className={cx('field', inline && 'field--inline')}>
      <label className="field__label" htmlFor={id}>{label}</label>
      <select id={id} className="select select--sm" value={value} onChange={e => onChange(e.target.value as V)}>
        {children}
      </select>
    </div>
  );
}
