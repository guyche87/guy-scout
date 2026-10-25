// FM24-style left navigation (docs/ui-design.md section 5.1 ".fm-sidebar"). Route links with
// aria-current="page"; collapses to icons below 1100px via CSS (labels stay readable by screen readers).
import type { ReactNode } from 'react';
import { formatRoute, type Page, type Route } from '../lib/router.ts';
import { useCompare } from '../state/compare.tsx';
import { useShortlists } from '../state/shortlists.tsx';
import { PageIcon } from './icons.tsx';

interface ItemProps {
  page: Page;
  label: string;
  route: Route;
  badge?: { count: number; context: string } | null;
}

function Item({ page, label, route, badge }: ItemProps) {
  return (
    <a
      className="fm-sidebar__item"
      href={formatRoute({ page })}
      aria-current={route.page === page ? 'page' : undefined}
      title={label}
    >
      <PageIcon page={page} className="fm-sidebar__icon" />
      <span className="fm-sidebar__label">{label}</span>
      {badge && badge.count > 0 && (
        <span className="fm-sidebar__badge">
          {badge.count > 99 ? '99+' : badge.count}
          <span className="visually-hidden"> {badge.context}</span>
        </span>
      )}
    </a>
  );
}

function Group({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    <ul className="fm-sidebar__group">
      {heading && <li className="fm-sidebar__heading" aria-hidden="true">{heading}</li>}
      {children}
    </ul>
  );
}

export function FmSidebar({ route }: { route: Route }) {
  const compare = useCompare();
  const shortlists = useShortlists();
  return (
    <nav className="fm-sidebar" aria-label="Main">
      <a className="fm-sidebar__brand" href={formatRoute({ page: 'players' })} title="Guy Scout">
        <span className="fm-sidebar__logo" aria-hidden="true">GS</span>
        <span className="fm-sidebar__label">Guy Scout</span>
      </a>
      <Group heading="Scouting">
        <li><Item page="players" label="Players" route={route} /></li>
        <li><Item page="staff" label="Staff" route={route} /></li>
        <li><Item page="clubs" label="Clubs" route={route} /></li>
      </Group>
      <Group heading="Lists">
        <li>
          <Item
            page="shortlists"
            label="Shortlists"
            route={route}
            badge={{ count: shortlists.activeSet.size, context: 'players in the active shortlist' }}
          />
        </li>
        <li>
          <Item page="compare" label="Compare" route={route} badge={{ count: compare.ids.length, context: 'players to compare' }} />
        </li>
      </Group>
      <div className="fm-sidebar__footer">
        <Item page="settings" label="Settings" route={route} />
      </div>
    </nav>
  );
}
