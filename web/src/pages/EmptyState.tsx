// Shown on data pages until a game or snapshot is loaded.
import { useEffect, useState } from 'react';
import type { SnapshotInfo } from '../../../shared/api.ts';
import { api } from '../api/client.ts';
import { Callout, EmptyState, Progress, Spinner } from '../components/EmptyState.tsx';
import { bytes, date, dateTime } from '../lib/format.ts';
import { useStatus } from '../state/status.tsx';

export function NoDataState() {
  const { status, offline, loading, loadGame, loadSnapshot, refresh } = useStatus();
  const [snapshots, setSnapshots] = useState<SnapshotInfo[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (offline) return;
    let cancelled = false;
    api.snapshots({ quiet: true }).then(
      s => !cancelled && setSnapshots(s),
      () => !cancelled && setSnapshots([]),
    );
    return () => {
      cancelled = true;
    };
  }, [offline]);

  if (offline) {
    return (
      <div className="page">
        <div className="page__inner">
          <EmptyState
            icon="!"
            title="The scout server is not running"
            actions={<button type="button" className="btn btn--primary" onClick={() => void refresh()}>Try again</button>}
          >
            Start it from the project folder with <span className="kbd">npm start</span>, then reload this page.
          </EmptyState>
        </div>
      </div>
    );
  }

  const p = status?.progress;
  const open = async (name: string) => {
    setBusy(name);
    try {
      await loadSnapshot(name);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page">
      <div className="page__inner">
        {loading ? (
          <EmptyState icon={<Spinner />} title="Reading the game…">
            <div className="stack">
              <Progress large label={p?.phase ?? 'Starting'} done={p?.done ?? 0} total={p?.total ?? 0} />
              <span className="small muted">FM is read without changing anything. This takes a little while for a big database.</span>
            </div>
          </EmptyState>
        ) : (
          <EmptyState
            icon="GS"
            title="Not connected to FM"
            actions={
              <button type="button" className="btn btn--primary" onClick={() => void loadGame()}>
                Load game
              </button>
            }
          >
            Start FM24, load your save, then click <strong>Load game</strong>. You can also open a saved snapshot below to browse offline.
          </EmptyState>
        )}

        {status?.state === 'error' && status.message && (
          <Callout variant="error" title="The last load failed">{status.message}</Callout>
        )}
        {status && !status.fmRunning && !loading && (
          <Callout variant="warning" title="FM is not running">
            Start Football Manager 2024 and load a save, or open a snapshot.
          </Callout>
        )}

        <section className="card" aria-labelledby="snap-title">
          <div className="card__header">
            <h2 className="card__title" id="snap-title">Snapshots</h2>
          </div>
          <div className="card__body">
            {snapshots === null && <Spinner label="Loading snapshots" />}
            {snapshots !== null && snapshots.length === 0 && (
              <p className="muted">No snapshots yet. After loading the game, use Snapshots → Save to keep a copy for offline browsing.</p>
            )}
            {snapshots !== null && snapshots.length > 0 && (
              <ul className="stack" aria-label="Saved snapshots">
                {snapshots.map(s => (
                  <li key={s.name} className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn btn--sm"
                      disabled={busy !== null || loading}
                      aria-busy={busy === s.name || undefined}
                      onClick={() => void open(s.name)}
                    >
                      Open
                    </button>
                    <span className="strong truncate">{s.name}</span>
                    <span className="small muted tabular">
                      {s.gameDate ? `Game date ${date(s.gameDate)} · ` : ''}saved {dateTime(s.savedAt)} · {bytes(s.sizeBytes)}
                    </span>
                    <a className="link-btn link-btn--muted small ml-auto" href={api.snapshotDownloadUrl(s.name)} download>
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
