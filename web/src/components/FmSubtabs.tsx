// FM24 sub-tabs under the header (docs/ui-design.md section 5.1 ".fm-subtabs"). Route links: the view is a
// ?view= parameter the page applies on top of its own filters (Players: All / My club / Shortlist;
// Staff: All / My club; Clubs: All / My club opens the human club).
import { int } from '../lib/format.ts';
import { formatRoute, type Route } from '../lib/router.ts';
import { useShortlists } from '../state/shortlists.tsx';
import { useStatus } from '../state/status.tsx';

export type ListView = 'all' | 'myclub' | 'shortlist';

/** The sub-view requested by the route (?view=myclub | shortlist). */
export function routeView(route: Route): ListView {
  const v = route.params.view;
  return v === 'myclub' || v === 'shortlist' ? v : 'all';
}

interface TabDef {
  key: string;
  label: string;
  href: string;
  current: boolean;
  count?: string;
  title?: string;
}

export function FmSubtabs({ route }: { route: Route }) {
  const { status, hasData } = useStatus();
  const shortlists = useShortlists();
  const myClub = hasData ? status?.humanClub ?? null : null;
  const myClubId = hasData ? status?.humanClubId ?? null : null;
  const view = routeView(route);

  let tabs: TabDef[] = [];
  let label = '';
  if (route.page === 'players') {
    label = 'Player views';
    const active = shortlists.lists.find(l => l.id === shortlists.activeId);
    tabs = [
      { key: 'all', label: 'All players', href: formatRoute({ page: 'players' }), current: view === 'all' },
      ...(myClub
        ? [{ key: 'myclub', label: 'My club', href: formatRoute({ page: 'players', params: { view: 'myclub' } }), current: view === 'myclub', title: myClub }]
        : []),
      {
        key: 'shortlist',
        label: active ? `Shortlist: ${active.name}` : 'Shortlist',
        href: formatRoute({ page: 'players', params: { view: 'shortlist' } }),
        current: view === 'shortlist',
        count: shortlists.activeSet.size ? int(shortlists.activeSet.size) : undefined,
        title: 'Players in the active shortlist, with the filters applied',
      },
    ];
  } else if (route.page === 'staff') {
    label = 'Staff views';
    tabs = [
      { key: 'all', label: 'All staff', href: formatRoute({ page: 'staff' }), current: view === 'all' },
      ...(myClub
        ? [{ key: 'myclub', label: 'My club', href: formatRoute({ page: 'staff', params: { view: 'myclub' } }), current: view === 'myclub', title: myClub }]
        : []),
    ];
  } else if (route.page === 'clubs') {
    label = 'Club views';
    const onMine = myClubId !== null && route.id === String(myClubId);
    tabs = [
      { key: 'all', label: 'All clubs', href: formatRoute({ page: 'clubs' }), current: !onMine },
      ...(myClub && myClubId !== null
        ? [{ key: 'myclub', label: `My club: ${myClub}`, href: formatRoute({ page: 'clubs', id: myClubId }), current: onMine }]
        : []),
    ];
  }

  if (!tabs.length) return null;

  return (
    <nav className="fm-subtabs" aria-label={label}>
      {tabs.map(t => (
        <a
          key={t.key}
          className="fm-subtabs__tab"
          href={t.href}
          aria-current={t.current ? 'page' : undefined}
          title={t.title}
        >
          {t.label}
          {t.count && (
            <span className="fm-subtabs__count">
              {t.count}
              <span className="visually-hidden"> players</span>
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}
