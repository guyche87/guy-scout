// Connection state pill (docs/ui-design.md ".pill-status") from /api/status.
import type { Status } from '../../../shared/api.ts';
import { date, percent } from '../lib/format.ts';

export type PillState = 'connected' | 'loading' | 'offline' | 'error' | 'snapshot';

export function pillState(status: Status | null, offline: boolean): { state: PillState; label: string; detail: string | null } {
  if (offline) return { state: 'error', label: 'Server offline', detail: 'start it with npm start' };
  if (!status) return { state: 'loading', label: 'Connecting', detail: null };
  if (status.state === 'loading') {
    const p = status.progress;
    const pct = p && p.total > 0 ? ` ${percent(p.done, p.total)}%` : '';
    return { state: 'loading', label: 'Loading', detail: p ? `${p.phase.toLowerCase()}${pct}` : null };
  }
  if (status.state === 'error') return { state: 'error', label: 'Error', detail: status.message };
  if (status.state === 'ready' && status.source === 'snapshot') {
    return { state: 'snapshot', label: 'Snapshot', detail: status.snapshotName ?? (status.gameDate ? date(status.gameDate) : null) };
  }
  if (status.state === 'ready' && status.source === 'live') {
    return { state: 'connected', label: 'Live', detail: status.gameDate ? date(status.gameDate) : 'FM 2024' };
  }
  return { state: 'offline', label: 'Not connected', detail: status.fmRunning ? 'FM is running' : null };
}

export function StatusPill({ status, offline }: { status: Status | null; offline: boolean }) {
  const { state, label, detail } = pillState(status, offline);
  return (
    <span className="pill-status" data-state={state} role="status" title={detail ? `${label}: ${detail}` : label}>
      <span className="pill-status__dot" aria-hidden="true" />
      <span className="pill-status__label">{label}</span>
      {detail && <span className="pill-status__detail">{detail}</span>}
    </span>
  );
}
