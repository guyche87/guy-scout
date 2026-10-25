// Settings: currency, rating weights, per-role key/preferred attribute editor (Settings.roleOverrides), theme.
import { useEffect, useId, useMemo, useState } from 'react';
import { ATTR_LABELS, GOALKEEPING, MENTAL, PHYSICAL, TECHNICAL, type PlayerAttrKey } from '../../../shared/attributes.ts';
import { ROLE_BY_ID, roleLabel } from '../../../shared/roles.ts';
import type { Settings } from '../../../shared/types.ts';
import { Callout } from '../components/EmptyState.tsx';
import { NumberInput, Segmented } from '../components/Inputs.tsx';
import { cssVars } from '../lib/css.ts';
import { money, wage } from '../lib/format.ts';
import { useTheme } from '../lib/theme.ts';
import { useMeta } from '../state/meta.tsx';
import { useSettings } from '../state/settings.tsx';
import { ROLE_GROUPS, roleOptionLabel } from './PlayerFilters.tsx';

type Level = 'none' | 'preferred' | 'key';
const LEVELS: { value: Level; label: string }[] = [
  { value: 'none', label: '–' },
  { value: 'preferred', label: 'Pref' },
  { value: 'key', label: 'Key' },
];

const EDITOR_GROUPS: { title: string; keys: readonly PlayerAttrKey[] }[] = [
  { title: 'Technical', keys: TECHNICAL },
  { title: 'Mental', keys: MENTAL },
  { title: 'Physical', keys: PHYSICAL },
  { title: 'Goalkeeping', keys: GOALKEEPING },
];

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every(x => b.includes(x));

export function SettingsPage() {
  const { settings, loaded, save } = useSettings();
  const [theme, setTheme] = useTheme();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [roleId, setRoleId] = useState<string>(ROLE_GROUPS[0]?.roles[0]?.id ?? '');
  const ids = { symbol: useId(), rate: useId(), role: useId(), key: useId(), pref: useId() };

  // Adopt the server copy when it arrives / after a save.
  useEffect(() => setDraft(settings), [settings]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const role = ROLE_BY_ID[roleId];
  const override = draft.roleOverrides[roleId];
  const keyAttrs = override?.key ?? role?.key ?? [];
  const prefAttrs = override?.preferred ?? role?.preferred ?? [];
  const customised = useMemo(() => Object.keys(draft.roleOverrides).filter(id => ROLE_BY_ID[id]), [draft.roleOverrides]);

  const levelOf = (k: PlayerAttrKey): Level => (keyAttrs.includes(k) ? 'key' : prefAttrs.includes(k) ? 'preferred' : 'none');

  const setLevel = (k: PlayerAttrKey, lvl: Level) => {
    if (!role) return;
    const key = keyAttrs.filter(x => x !== k);
    const preferred = prefAttrs.filter(x => x !== k);
    if (lvl === 'key') key.push(k);
    if (lvl === 'preferred') preferred.push(k);
    const overrides = { ...draft.roleOverrides };
    if (sameSet(key, role.key) && sameSet(preferred, role.preferred)) delete overrides[roleId];
    else overrides[roleId] = { key, preferred };
    setDraft({ ...draft, roleOverrides: overrides });
  };

  const resetRole = () => {
    const overrides = { ...draft.roleOverrides };
    delete overrides[roleId];
    setDraft({ ...draft, roleOverrides: overrides });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await save(draft);
    } finally {
      setSaving(false);
    }
  };

  const fmt = { symbol: draft.currencySymbol || '£', rate: draft.currencyRate > 0 ? draft.currencyRate : 1 };
  const { currencies } = useMeta();
  const fmCurrency = currencies.find(c => c.symbol === draft.currencySymbol && Math.abs(c.rate - draft.currencyRate) < 0.0005);

  return (
    <div className="page">
      <div className="page__inner">
        {/* The page <h1> is in the FM header; this is the section strip. */}
        <div className="fm-section-bar">
          <h2 className="fm-section-title">Scout settings</h2>
          <div className="fm-section-bar__actions">
            {dirty && <span className="eyebrow">Unsaved changes</span>}
            <button type="button" className="btn btn--ghost btn--sm" disabled={!dirty || saving} onClick={() => setDraft(settings)}>Revert</button>
            <button type="button" className="btn btn--primary btn--sm" disabled={!dirty} aria-busy={saving || undefined} onClick={() => void onSave()}>Save settings</button>
          </div>
        </div>
        {!loaded && <Callout variant="warning" title="Settings not loaded">The server has not answered yet; showing defaults.</Callout>}

        <div className="card-grid">
          <section className="card" aria-labelledby="set-cur">
            <div className="card__header"><h2 className="card__title" id="set-cur">Currency</h2></div>
            <div className="card__body stack gap-3">
              {currencies.length > 0 && (
                <div className="field">
                  <label className="field__label" htmlFor={ids.symbol + '-fm'}>FM currency <span className="field__aside">rates from your game</span></label>
                  <select
                    id={ids.symbol + '-fm'}
                    className="select select--sm"
                    value={fmCurrency?.name ?? ''}
                    onChange={e => {
                      const c = currencies.find(x => x.name === e.target.value);
                      if (c) setDraft({ ...draft, currencySymbol: c.symbol, currencyRate: c.rate });
                    }}
                  >
                    <option value="">Custom</option>
                    {currencies.map(c => <option key={c.name} value={c.name}>{c.name} ({c.symbol})</option>)}
                  </select>
                </div>
              )}
              <div className="field-row">
                <div className="field">
                  <label className="field__label" htmlFor={ids.symbol}>Symbol</label>
                  <input
                    id={ids.symbol}
                    className="input input--sm"
                    value={draft.currencySymbol}
                    maxLength={4}
                    onChange={e => setDraft({ ...draft, currencySymbol: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor={ids.rate}>Rate <span className="field__aside">× GBP</span></label>
                  <NumberInput
                    id={ids.rate}
                    value={draft.currencyRate}
                    step={0.01}
                    min={0.0001}
                    small
                    onChange={v => setDraft({ ...draft, currencyRate: v && v > 0 ? v : 1 })}
                  />
                </div>
              </div>
              <p className="field__hint">
                FM stores money in pounds. Preview: {money(45_500_000, fmt)} value, {wage(126_000, fmt)}.
              </p>
            </div>
          </section>

          <section className="card" aria-labelledby="set-w">
            <div className="card__header"><h2 className="card__title" id="set-w">Rating weights</h2></div>
            <div className="card__body stack gap-3">
              <div className="field-row">
                <div className="field">
                  <label className="field__label" htmlFor={ids.key}>Key attributes</label>
                  <NumberInput id={ids.key} value={draft.ratingWeights.key} min={0} max={10} step={0.5} small
                    onChange={v => setDraft({ ...draft, ratingWeights: { ...draft.ratingWeights, key: v ?? 0 } })} />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor={ids.pref}>Preferred attributes</label>
                  <NumberInput id={ids.pref} value={draft.ratingWeights.preferred} min={0} max={10} step={0.5} small
                    onChange={v => setDraft({ ...draft, ratingWeights: { ...draft.ratingWeights, preferred: v ?? 0 } })} />
                </div>
              </div>
              <p className="field__hint">Role rating = weighted average of the role's key and preferred attributes (20 = 100%). Default 2 and 1.</p>
            </div>
          </section>

          <section className="card" aria-labelledby="set-theme">
            <div className="card__header"><h2 className="card__title" id="set-theme">Appearance</h2></div>
            <div className="card__body stack gap-2">
              <span className="field__label" id="theme-label">Theme</span>
              <Segmented
                label="Theme"
                value={theme}
                onChange={setTheme}
                options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
              />
              <p className="field__hint">Saved in this browser only.</p>
            </div>
          </section>
        </div>

        <section className="card" aria-labelledby="set-roles">
          <div className="card__header">
            <h2 className="card__title" id="set-roles">Role editor</h2>
            <div className="card__actions">
              {override && <span className="badge badge--accent">Customised</span>}
              <button type="button" className="btn btn--ghost btn--sm" disabled={!override} onClick={resetRole}>Reset to FM default</button>
            </div>
          </div>
          <div className="card__body stack gap-3">
            <div className="field field--inline" style={cssVars({ '--field-control-w': '320px' })}>
              <label className="field__label" htmlFor={ids.role}>Role</label>
              <select id={ids.role} className="select select--sm" value={roleId} onChange={e => setRoleId(e.target.value)}>
                {ROLE_GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.roles.map(r => (
                      <option key={r.id} value={r.id}>{roleOptionLabel(r)}{draft.roleOverrides[r.id] ? ' *' : ''}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {role && (
              <p className="small subtle">
                {roleLabel(role)} · positions {role.positions.join(', ')} · {keyAttrs.length} key, {prefAttrs.length} preferred.
                Key = solid bar, preferred = dotted bar.
              </p>
            )}
            {customised.length > 0 && (
              <div className="cluster" aria-label="Customised roles">
                <span className="xsmall muted">Customised:</span>
                {customised.map(id => (
                  <button key={id} type="button" className="chip chip--sm" onClick={() => setRoleId(id)} aria-pressed={id === roleId}>
                    <span className="chip__label">{ROLE_BY_ID[id] ? roleLabel(ROLE_BY_ID[id]) : id}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="attr-grid">
              {EDITOR_GROUPS.map(g => (
                <section key={g.title} className="attr-group" aria-labelledby={`re-${g.title}`}>
                  <h3 className="attr-group__title" id={`re-${g.title}`}>{g.title}</h3>
                  <ul className="attr-list">
                    {g.keys.map(k => {
                      const lvl = levelOf(k);
                      return (
                        <li key={k} className="attr-row" data-emphasis={lvl === 'none' ? undefined : lvl}>
                          <span className="attr-row__label" title={ATTR_LABELS[k]}>{ATTR_LABELS[k]}</span>
                          <span />
                          <Segmented label={`${ATTR_LABELS[k]} importance`} value={lvl} onChange={v => setLevel(k, v)} options={LEVELS} />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
          <div className="card__footer">
            <span className="small muted">Changes apply to every rating (search, profiles, export) after you save.</span>
            <span className="spacer" />
            <button type="button" className="btn btn--primary btn--sm" disabled={!dirty} aria-busy={saving || undefined} onClick={() => void onSave()}>
              Save settings
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
