// Player filter sections: General, Contract, Attributes, Personality (+ quick presets).
import { memo, useMemo } from 'react';
import type { Meta, PlayerQuery } from '../../../shared/api.ts';
import {
  ATTR_LABELS, FAMILIARITY, GOALKEEPING, HIDDEN, MENTAL, PERSONALITY, PERSONALITY_LABELS, PHYSICAL, TECHNICAL,
  type PlayerAttrKey, type PositionKey,
} from '../../../shared/attributes.ts';
import { DUTY_LABELS, ROLES, type RoleDef } from '../../../shared/roles.ts';
import { FilterSection } from '../components/FilterSection.tsx';
import { Checkbox, MinGrid, MoneyInput, NumberInput, RangeInput, SelectField, TextField, TriState } from '../components/Inputs.tsx';
import { MultiSelect, toOptions, type Option } from '../components/MultiSelect.tsx';
import { PositionPicker } from '../components/Pitch.tsx';
import { cssVars } from '../lib/css.ts';
import { int, type MoneyFormat } from '../lib/format.ts';
import { PLAYER_PRESETS, setBound } from '../lib/query.ts';

// Role families for the grouped role select (each role listed once, under its first position).
const FAMILY_OF: Record<PositionKey, string> = {
  GK: 'Goalkeeper', SW: 'Central defender', DC: 'Central defender', DL: 'Full-back', DR: 'Full-back',
  WBL: 'Wing-back', WBR: 'Wing-back', DM: 'Defensive midfield', MC: 'Central midfield', ML: 'Wide midfield',
  MR: 'Wide midfield', AML: 'Wide attacker', AMR: 'Wide attacker', AMC: 'Attacking midfield', ST: 'Striker',
};

export const ROLE_GROUPS: { label: string; roles: RoleDef[] }[] = (() => {
  const m = new Map<string, RoleDef[]>();
  for (const r of ROLES) {
    const fam = FAMILY_OF[r.positions[0]] ?? 'Other';
    const list = m.get(fam);
    if (list) list.push(r);
    else m.set(fam, [r]);
  }
  return [...m.entries()].map(([label, roles]) => ({ label, roles }));
})();

export const roleOptionLabel = (r: RoleDef) => `${r.name} (${DUTY_LABELS[r.duty]})`;

const FAM_OPTIONS = [
  { v: FAMILIARITY.natural, label: 'Natural (18+)' },
  { v: FAMILIARITY.accomplished, label: 'Accomplished (15+)' },
  { v: FAMILIARITY.competent, label: 'Competent (12+)' },
  { v: FAMILIARITY.unconvincing, label: 'Unconvincing (9+)' },
  { v: FAMILIARITY.awkward, label: 'Awkward (5+)' },
];

const ATTR_GROUPS: { id: string; title: string; keys: readonly PlayerAttrKey[] }[] = [
  { id: 'tech', title: 'Technical', keys: TECHNICAL },
  { id: 'mental', title: 'Mental', keys: MENTAL },
  { id: 'phys', title: 'Physical', keys: PHYSICAL },
  { id: 'gk', title: 'Goalkeeping', keys: GOALKEEPING },
  { id: 'hidden', title: 'Hidden', keys: HIDDEN },
];

export function leagueOptions(meta: Meta): Option[] {
  const byName = new Map<string, { nations: Set<string>; players: number }>();
  for (const l of meta.leagues) {
    const e = byName.get(l.name);
    if (e) {
      e.nations.add(l.nation);
      e.players += l.players;
    } else {
      byName.set(l.name, { nations: new Set(l.nation ? [l.nation] : []), players: l.players });
    }
  }
  return [...byName.entries()].map(([name, e]) => {
    const nations = [...e.nations];
    const where = nations.length === 1 ? nations[0] : nations.length > 1 ? `${nations.length} nations` : '';
    return {
      value: name,
      meta: [where, e.players ? int(e.players) : ''].filter(Boolean).join(' · '),
      keywords: nations.join(' '),
    };
  });
}

interface PlayerFiltersProps {
  query: PlayerQuery;
  onChange: (q: PlayerQuery) => void;
  meta: Meta;
  money: MoneyFormat;
  gameDate: string | null;
  myClub: string | null;
  nameInputId: string;
  /** Hide filters that make no sense in a fixed context (e.g. inside a shortlist). */
  compact?: boolean;
}

export const PlayerFilters = memo(function PlayerFilters({ query: q, onChange, meta, money, gameDate, myClub, nameInputId }: PlayerFiltersProps) {
  const set = <K extends keyof PlayerQuery>(k: K, v: PlayerQuery[K]) => {
    const next = { ...q };
    if (v === undefined || (Array.isArray(v) && v.length === 0)) delete next[k];
    else next[k] = v;
    onChange(next);
  };

  const nationOpts = useMemo(() => toOptions(meta.nations), [meta.nations]);
  const leagueOpts = useMemo(() => leagueOptions(meta), [meta]);
  const labelOpts = useMemo(() => toOptions(meta.personalityLabels), [meta.personalityLabels]);
  const traitOpts = useMemo(() => toOptions(meta.traits), [meta.traits]);

  const generalCount = [
    q.text?.trim(), q.club?.trim(), q.nations?.length, q.leagues?.length, q.age, q.ca, q.pa, q.growth, q.height,
    q.positions?.length, q.role, q.foot, q.myClub, q.freeAgent !== undefined,
  ].filter(Boolean).length;
  const contractCount = [
    q.wage, q.value, q.contractExpiresBefore, q.transferListed !== undefined, q.loanListed !== undefined,
    q.onLoan !== undefined, q.hasReleaseClause !== undefined,
  ].filter(Boolean).length;
  const attrCount = Object.values(q.attrs ?? {}).filter(v => typeof v === 'number' && v > 0).length;
  const persCount = Object.values(q.personality ?? {}).filter(v => typeof v === 'number' && v > 0).length
    + (q.personalityLabels?.length ? 1 : 0) + (q.traits?.length ? 1 : 0);

  return (
    <>
      <div className="filter-section__body">
        <span className="eyebrow">Quick presets</span>
        <div className="cluster" role="group" aria-label="Quick presets">
          {PLAYER_PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              className="btn btn--sm"
              title={`${p.title} (replaces the current filters)`}
              onClick={() => onChange(p.build({ gameDate, money }))}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <FilterSection id="players.general" title="General" count={generalCount} defaultOpen>
        <TextField label="Name" aside="contains" value={q.text ?? ''} onChange={v => set('text', v || undefined)} search placeholder="Search players" inputId={nameInputId} />
        <TextField label="Club" aside="contains" value={q.club ?? ''} onChange={v => set('club', v || undefined)} />
        <MultiSelect label="Nationality" options={nationOpts} value={q.nations} onChange={v => set('nations', v)} hint="Primary or second nationality" />
        <MultiSelect label="League" options={leagueOpts} value={q.leagues} onChange={v => set('leagues', v)} />
        <div className="field-row">
          <RangeInput label="Age" value={q.age} onChange={r => set('age', r)} min={13} max={50} />
          <RangeInput label="Height" value={q.height} onChange={r => set('height', r)} min={140} max={220} unit="cm" />
        </div>
        <div className="field-row">
          <RangeInput label="Current" value={q.ca} onChange={r => set('ca', r)} min={1} max={200} />
          <RangeInput label="Potential" value={q.pa} onChange={r => set('pa', r)} min={1} max={200} />
        </div>
        <div className="field field--inline" style={cssVars({ '--field-control-w': '64px' })}>
          <label className="field__label" htmlFor="pf-growth">Growth (Potential − Current) at least</label>
          <NumberInput id="pf-growth" value={q.growth?.min} onChange={v => set('growth', setBound(q.growth, 'min', v))} min={0} max={199} placeholder="–" />
        </div>

        <div className="field">
          <span className="field__label">
            Positions
            {q.positions?.length ? (
              <button type="button" className="link-btn link-btn--muted field__aside" onClick={() => onChange({ ...q, positions: undefined, minFamiliarity: undefined })}>
                clear
              </button>
            ) : null}
          </span>
          <PositionPicker value={q.positions} onChange={v => set('positions', v.length ? v : undefined)} label="Positions (any of)" />
        </div>
        <SelectField
          label="Min. familiarity"
          inline
          value={String(q.minFamiliarity ?? FAMILIARITY.accomplished)}
          onChange={v => set('minFamiliarity', Number(v) === FAMILIARITY.accomplished ? undefined : Number(v))}
        >
          {FAM_OPTIONS.map(o => (
            <option key={o.v} value={o.v}>{o.label}</option>
          ))}
        </SelectField>

        <SelectField label="Role" value={q.role ?? ''} onChange={v => onChange(v ? { ...q, role: v } : { ...q, role: undefined, minRoleRating: undefined })}>
          <option value="">Any role</option>
          {ROLE_GROUPS.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.roles.map(r => (
                <option key={r.id} value={r.id}>{roleOptionLabel(r)}</option>
              ))}
            </optgroup>
          ))}
        </SelectField>
        <div className="field field--inline" style={cssVars({ '--field-control-w': '64px' })}>
          <label className="field__label" htmlFor="pf-rolemin">Min. role rating %</label>
          <NumberInput id="pf-rolemin" value={q.minRoleRating} onChange={v => set('minRoleRating', v)} min={0} max={100} placeholder="–" />
        </div>

        <SelectField
          label="Foot"
          inline
          value={q.foot ?? ''}
          onChange={v => set('foot', v === 'left' || v === 'right' || v === 'both' ? v : undefined)}
        >
          <option value="">Any</option>
          <option value="left">Left (strong)</option>
          <option value="right">Right (strong)</option>
          <option value="both">Either (both strong)</option>
        </SelectField>
        <Checkbox checked={!!q.myClub} onChange={v => set('myClub', v ? true : undefined)} disabled={!myClub} title={myClub ?? 'No human club in this save'}>
          My club only{myClub ? ` (${myClub})` : ''}
        </Checkbox>
        <TriState label="Free agents" value={q.freeAgent} onChange={v => set('freeAgent', v)} yes="Only" no="Exclude" />
      </FilterSection>

      <FilterSection id="players.contract" title="Contract" count={contractCount}>
        <MoneyInput label="Max wage" suffix="per week" value={q.wage?.max} onChange={v => set('wage', setBound(q.wage, 'max', v))} money={money} hint="e.g. 50K" />
        <MoneyInput label="Max sale value" value={q.value?.max} onChange={v => set('value', setBound(q.value, 'max', v))} money={money} hint="e.g. 2.5M" />
        <div className="field">
          <label className="field__label" htmlFor="pf-expires">Contract expires by</label>
          <input
            id="pf-expires"
            type="date"
            className="input input--sm"
            value={q.contractExpiresBefore ?? ''}
            onChange={e => set('contractExpiresBefore', e.target.value || undefined)}
          />
        </div>
        <TriState label="Transfer listed" value={q.transferListed} onChange={v => set('transferListed', v)} />
        <TriState label="Loan listed" value={q.loanListed} onChange={v => set('loanListed', v)} />
        <TriState label="On loan" value={q.onLoan} onChange={v => set('onLoan', v)} />
        <TriState label="Release clause" value={q.hasReleaseClause} onChange={v => set('hasReleaseClause', v)} />
      </FilterSection>

      <FilterSection id="players.attrs" title="Attributes" count={attrCount}>
        <p className="field__hint">Minimum values (1–20).</p>
        {ATTR_GROUPS.map(g => {
          const active = g.keys.filter(k => (q.attrs?.[k] ?? 0) > 0).length;
          return (
            <div key={g.id} className="stack" role="group" aria-label={`${g.title} minimums`}>
              <div className="flex items-center">
                <span className="eyebrow">{g.title}</span>
                {active > 0 && (
                  <button
                    type="button"
                    className="link-btn link-btn--muted xsmall ml-auto"
                    aria-label={`Clear ${g.title.toLowerCase()} minimums`}
                    onClick={() => {
                      const attrs = { ...q.attrs };
                      for (const k of g.keys) delete attrs[k];
                      set('attrs', Object.keys(attrs).length ? attrs : undefined);
                    }}
                  >
                    clear
                  </button>
                )}
              </div>
              <MinGrid
                keys={g.keys}
                labels={ATTR_LABELS}
                values={q.attrs}
                onChange={vals => {
                  const attrs = { ...q.attrs };
                  for (const k of g.keys) delete attrs[k];
                  Object.assign(attrs, vals);
                  set('attrs', Object.keys(attrs).length ? attrs : undefined);
                }}
              />
            </div>
          );
        })}
      </FilterSection>

      <FilterSection id="players.personality" title="Personality" count={persCount}>
        <p className="field__hint">Minimum values; Controversy is a maximum.</p>
        <MinGrid
          keys={PERSONALITY}
          labels={PERSONALITY_LABELS}
          values={q.personality}
          maxKeys={['controversy']}
          onChange={vals => set('personality', Object.keys(vals).length ? vals : undefined)}
        />
        <MultiSelect label="Personality" options={labelOpts} value={q.personalityLabels} onChange={v => set('personalityLabels', v)} hint="Any of these" />
        <MultiSelect label="Traits" options={traitOpts} value={q.traits} onChange={v => set('traits', v)} hint="Must have all of these" />
      </FilterSection>
    </>
  );
});
