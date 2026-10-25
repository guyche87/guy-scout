// FM24-style header (docs/ui-design.md section 5.1 ".fm-header"): back/forward, page title + subtitle,
// status pill, snapshots menu, theme toggle, amber in-game date and the violet Load / Reload CTA.
import { useState } from 'react';
import type { SnapshotInfo } from '../../../shared/api.ts';
import { api } from '../api/client.ts';
import { bytes, date, dateTime, int, parseIsoDate, percent } from '../lib/format.ts';
import type { Page, Route } from '../lib/router.ts';
import { useTheme } from '../lib/theme.ts';
import { toast } from '../lib/toast.ts';
import { useCompare } from '../state/compare.tsx';
import { useShortlists } from '../state/shortlists.tsx';
import { useStatus, type StatusState } from '../state/status.tsx';
import { Modal } from './Drawer.tsx';
import { Spinner } from './EmptyState.tsx';
import { DownloadIcon, InfoIcon, MoonIcon, PageIcon, SunIcon } from './icons.tsx';
import { Popover } from './Popover.tsx';
import { StatusPill } from './StatusPill.tsx';

const TITLES: Record<Page, string> = {
  players: 'Players',
  staff: 'Staff',
  clubs: 'Clubs',
  shortlists: 'Shortlists',
  compare: 'Compare',
  settings: 'Settings',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekday(iso: string | null | undefined): string {
  const p = parseIsoDate(iso);
  if (!p) return '';
  return WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()] ?? '';
}

/** "Live data from FM" / 'Snapshot "name"' / loading / not connected. */
export function sourceText(s: StatusState): string {
  const st = s.status;
  if (s.offline) return 'Scout server offline';
  if (!st) return 'Connecting…';
  if (st.state === 'loading' && !s.hasData) return 'Reading the game…';
  if (!s.hasData) return 'No game loaded';
  if (st.source === 'snapshot') return `Snapshot "${st.snapshotName ?? 'unnamed'}"`;
  return st.humanClub ? `Live data from FM · ${st.humanClub}` : 'Live data from FM';
}

interface FmHeaderProps {
  route: Route;
}

export function FmHeader({ route }: FmHeaderProps) {
  const statusState = useStatus();
  const { status, offline, hasData, loading, loadGame } = statusState;
  const shortlists = useShortlists();
  const compare = useCompare();
  const [theme, , toggleTheme] = useTheme();
  const [aboutOpen, setAboutOpen] = useState(false);

  const src = sourceText(statusState);
  const counts = status?.counts;
  let subtitle = src;
  switch (route.page) {
    case 'players': if (hasData && counts) subtitle = `${int(counts.players)} players · ${src}`; break;
    case 'staff': if (hasData && counts) subtitle = `${int(counts.staff)} staff · ${src}`; break;
    case 'clubs': if (hasData && counts) subtitle = `${int(counts.clubs)} clubs · ${src}`; break;
    case 'shortlists': {
      const active = shortlists.lists.find(l => l.id === shortlists.activeId);
      subtitle = `${int(shortlists.lists.length)} shortlist${shortlists.lists.length === 1 ? '' : 's'}${active ? ` · active: ${active.name}` : ''}`;
      break;
    }
    case 'compare': subtitle = `${compare.ids.length} of 4 players selected`; break;
    case 'settings': subtitle = 'Currency, rating weights and role definitions'; break;
  }

  // Navigation API (Chrome) tells whether back/forward are possible; otherwise keep both enabled.
  const navApi = (window as unknown as { navigation?: { canGoBack?: boolean; canGoForward?: boolean } }).navigation;
  const canBack = navApi?.canGoBack ?? true;
  const canForward = navApi?.canGoForward ?? true;

  const p = status?.progress;
  const pct = p && p.total > 0 ? percent(p.done, p.total) : null;
  const ctaLabel = loading ? (pct !== null ? `Loading ${pct}%` : 'Loading…') : hasData && status?.source === 'live' ? 'Reload' : 'Load game';
  const ctaTitle = loading
    ? `Reading the game${p ? `: ${p.phase}` : ''}`
    : status && !status.fmRunning
      ? 'FM24 does not seem to be running - start it and load your save first'
      : hasData && status?.source === 'live' ? 'Read the running game again (read-only)' : 'Read the running game (read-only)';

  const gameDate = hasData ? status?.gameDate ?? null : null;

  return (
    <header className="fm-header">
      <div className="fm-header__nav">
        <button type="button" className="fm-header__arrow" aria-label="Back" title="Back" disabled={!canBack} onClick={() => window.history.back()}>
          <span aria-hidden="true">‹</span>
        </button>
        <button type="button" className="fm-header__arrow" aria-label="Forward" title="Forward" disabled={!canForward} onClick={() => window.history.forward()}>
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="fm-header__titles">
        <PageIcon page={route.page} className="fm-header__title-icon" />
        <div className="fm-header__text">
          <h1 className="fm-header__title">{TITLES[route.page]}</h1>
          <p className="fm-header__subtitle" title={subtitle}>{subtitle}</p>
        </div>
      </div>
      <div className="fm-header__spacer" />
      <div className="fm-header__tools">
        <StatusPill status={status} offline={offline} />
        <SnapshotsMenu />
        <button
          type="button"
          className="btn btn--ghost btn--icon"
          aria-label={theme === 'light' ? 'Use dark theme' : 'Use light theme'}
          title={theme === 'light' ? 'Use dark theme' : 'Use light theme'}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <MoonIcon className="btn__icon" /> : <SunIcon className="btn__icon" />}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          title="About Guy Scout"
          onClick={() => setAboutOpen(true)}
        >
          <InfoIcon className="btn__icon" />
          About
        </button>
      </div>
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      {gameDate && (
        <div className="fm-header__date">
          <span className="visually-hidden">In-game date:</span>
          <span className="fm-header__date-day">
            {weekday(gameDate)} · {status?.source === 'snapshot' ? 'Snapshot' : 'Live'}
          </span>
          <span className="fm-header__date-full">{date(gameDate)}</span>
        </div>
      )}
      <button
        type="button"
        className="fm-cta"
        disabled={offline}
        title={ctaTitle}
        onClick={() => {
          if (!loading) void loadGame();
        }}
      >
        {ctaLabel}
      </button>
    </header>
  );
}

/** About dialog: tool name, author credit, and a one-line note on what it does. */
function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="About Guy Scout"
      size="sm"
      onClose={onClose}
      footer={<button type="button" className="btn btn--primary btn--sm" onClick={onClose}>Close</button>}
    >
      <div className="about">
        <div className="about__logo" aria-hidden="true">GS</div>
        <h3 className="about__name">Guy Scout</h3>
        <p className="about__tagline">A read-only scouting tool for Football Manager 2024.</p>
        <p className="about__credit">Created by <strong>Guy Chelouche</strong></p>
        <p className="about__note muted small">
          Reads the running game read-only — it never writes to FM or your saves. Inspired by FM Genie Scout;
          not affiliated with Sports Interactive or FM Genie Scout.
        </p>
      </div>
    </Modal>
  );
}

/** Save the loaded data as a snapshot, or open / download a saved one. */
export function SnapshotsMenu() {
  const { hasData, loadSnapshot, offline } = useStatus();
  const [list, setList] = useState<SnapshotInfo[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => {
    setList(null);
    api.snapshots().then(setList, () => setList([]));
  };

  const save = async () => {
    setBusy('save');
    try {
      const info = await api.saveSnapshot();
      toast.success(`${info.name} · ${bytes(info.sizeBytes)}`, { title: 'Snapshot saved' });
      refresh();
    } catch {
      // toast shown by the client
    } finally {
      setBusy(null);
    }
  };

  const open = async (name: string, close: () => void) => {
    setBusy(name);
    try {
      await loadSnapshot(name);
      close();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Popover
      label="Snapshots"
      kind="dialog"
      ariaLabel="Snapshots"
      buttonClassName="btn btn--ghost btn--sm"
      align="end"
      disabled={offline}
      onOpen={refresh}
    >
      {close => (
        <div className="menu" aria-label="Snapshots">
          <button
            type="button"
            className="menu__item"
            disabled={!hasData || busy !== null}
            aria-busy={busy === 'save' || undefined}
            title={hasData ? 'Save the loaded data to data/snapshots' : 'Load the game first'}
            onClick={() => void save()}
          >
            Save current data as snapshot
          </button>
          <div className="menu__sep" role="separator" />
          <div className="menu__label">Open a snapshot</div>
          {list === null && (
            <div className="menu__item" role="status">
              <Spinner size="sm" /> Loading…
            </div>
          )}
          {list !== null && list.length === 0 && <div className="menu__item muted">No snapshots saved yet.</div>}
          {list !== null && list.length > 0 && (
            <ul className="stack gap-0" aria-label="Saved snapshots">
              {list.map(s => (
                <li key={s.name} className="flex items-center gap-1">
                  <button
                    type="button"
                    className="menu__item flex-1"
                    disabled={busy !== null}
                    aria-busy={busy === s.name || undefined}
                    title={`Saved ${dateTime(s.savedAt)}`}
                    onClick={() => void open(s.name, close)}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto xsmall muted tabular">
                      {s.gameDate ? date(s.gameDate) : ''} · {bytes(s.sizeBytes)}
                    </span>
                  </button>
                  <a
                    className="btn btn--ghost btn--sm btn--icon"
                    href={api.snapshotDownloadUrl(s.name)}
                    download
                    aria-label={`Download ${s.name}`}
                    title="Download (.json.gz)"
                  >
                    <DownloadIcon className="btn__icon" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  );
}
