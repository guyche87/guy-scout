import type { ReactNode } from 'react';
import { LoadingBlock } from './components/EmptyState.tsx';
import { FmHeader } from './components/FmHeader.tsx';
import { FmSidebar } from './components/FmSidebar.tsx';
import { FmSubtabs } from './components/FmSubtabs.tsx';
import { ToastRegion } from './components/Toast.tsx';
import { closeOverlayHref, closeTo, useRoute, type Page, type Route } from './lib/router.ts';
import { ClubProfile } from './pages/ClubProfile.tsx';
import { ClubsPage } from './pages/ClubsPage.tsx';
import { ComparePage } from './pages/ComparePage.tsx';
import { NoDataState } from './pages/EmptyState.tsx';
import { PlayerProfile } from './pages/PlayerProfile.tsx';
import { PlayersPage } from './pages/PlayersPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { ShortlistsPage } from './pages/ShortlistsPage.tsx';
import { StaffPage } from './pages/StaffPage.tsx';
import { StaffProfile } from './pages/StaffProfile.tsx';
import { CompareProvider } from './state/compare.tsx';
import { MetaProvider } from './state/meta.tsx';
import { SettingsProvider } from './state/settings.tsx';
import { ShortlistsProvider } from './state/shortlists.tsx';
import { StatusProvider, useStatus } from './state/status.tsx';

export function App() {
  return (
    <StatusProvider>
      <SettingsProvider>
        <MetaProvider>
          <ShortlistsProvider>
            <CompareProvider>
              <Shell />
            </CompareProvider>
          </ShortlistsProvider>
        </MetaProvider>
      </SettingsProvider>
    </StatusProvider>
  );
}

/** FM24 shell: purple sidebar (left, all rows), header, optional sub-tabs, main. */
function Shell() {
  const route = useRoute();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main" onClick={e => {
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}>
        Skip to content
      </a>
      <FmSidebar route={route} />
      <FmHeader route={route} />
      <FmSubtabs route={route} />
      <main className="app-main" id="main" tabIndex={-1}>
        <MainContent route={route} />
      </main>
      <Overlays route={route} />
      <ToastRegion />
    </div>
  );
}

/** Pages that need loaded game data show the "load the game" state instead. */
const NEEDS_DATA: ReadonlySet<Page> = new Set(['players', 'staff', 'clubs', 'compare']);

function MainContent({ route }: { route: Route }) {
  const { status, hasData, offline } = useStatus();
  if (NEEDS_DATA.has(route.page) && !hasData) {
    if (!status && !offline) return <LoadingBlock label="Connecting to the scout server…" />;
    return <NoDataState />;
  }
  let page: ReactNode = null;
  switch (route.page) {
    case 'players': page = <PlayersPage route={route} />; break;
    case 'staff': page = <StaffPage route={route} />; break;
    case 'clubs': page = <ClubsPage route={route} />; break;
    case 'shortlists': page = <ShortlistsPage route={route} />; break;
    case 'compare': page = <ComparePage route={route} />; break;
    case 'settings': page = <SettingsPage />; break;
  }
  return page;
}

function parseId(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : null;
}

/** Profile drawers, stacked club < staff < player (later = on top). */
function Overlays({ route }: { route: Route }) {
  const { hasData } = useStatus();
  if (!hasData) return null;
  const clubId = route.page === 'clubs' ? parseId(route.id) : null;
  const staffId = route.page === 'staff' && route.id ? parseId(route.id) : parseId(route.params.staff);
  const playerId = route.page === 'players' && route.id ? parseId(route.id) : parseId(route.params.player);
  const staffViaParam = !(route.page === 'staff' && route.id);
  const playerViaParam = !(route.page === 'players' && route.id);
  return (
    <>
      {clubId !== null && (
        <ClubProfile id={clubId} route={route} onClose={() => closeTo(closeOverlayHref(route, 'id'))} />
      )}
      {staffId !== null && (
        <StaffProfile
          id={staffId}
          route={route}
          browse={!staffViaParam}
          onClose={() => closeTo(closeOverlayHref(route, staffViaParam ? 'staff' : 'id'))}
        />
      )}
      {playerId !== null && (
        <PlayerProfile
          id={playerId}
          route={route}
          browse={!playerViaParam}
          onClose={() => closeTo(closeOverlayHref(route, playerViaParam ? 'player' : 'id'))}
        />
      )}
    </>
  );
}
