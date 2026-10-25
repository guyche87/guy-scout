// Simple inline SVG icons (currentColor, decorative: always aria-hidden).
import type { Page } from '../lib/router.ts';

interface IconProps {
  className?: string;
}

const base = { viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function PlayersIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden="true">
      <circle cx="10" cy="6.5" r="3" />
      <path d="M4 17c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v4.5" />
      <circle cx="10" cy="6.4" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StaffIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden="true">
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="14" cy="7.5" r="2" />
      <path d="M2.5 16.5c.5-2.7 2.3-4.2 4.5-4.2s4 1.5 4.5 4.2M12 12.6c.6-.3 1.3-.4 2-.4 1.9 0 3.3 1.3 3.7 3.6" />
    </svg>
  );
}

export function ClubsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden="true">
      <path d="M10 2.5 16 4.5v5c0 3.8-2.6 6.6-6 8-3.4-1.4-6-4.2-6-8v-5z" />
      <path d="M10 6v8" />
    </svg>
  );
}

export function ShortlistsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden="true">
      <path d="m10 3 2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.8 5.8 16l.8-4.7L3.2 8l4.7-.7z" />
    </svg>
  );
}

export function CompareIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden="true">
      <rect x="3" y="4" width="5.5" height="12" rx="1" />
      <rect x="11.5" y="4" width="5.5" height="12" rx="1" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden="true">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden="true">
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.2 1.2M14.1 14.1l1.2 1.2M4.7 15.3l1.2-1.2M14.1 5.9l1.2-1.2" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M16 11.8A6.5 6.5 0 0 1 8.2 4a6.5 6.5 0 1 0 7.8 7.8z" fill="currentColor" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base} aria-hidden="true">
      <path d="M10 3v9M6 8.5l4 4 4-4M4 16h12" />
    </svg>
  );
}

export function PageIcon({ page, className }: { page: Page; className?: string }) {
  switch (page) {
    case 'players': return <PlayersIcon className={className} />;
    case 'staff': return <StaffIcon className={className} />;
    case 'clubs': return <ClubsIcon className={className} />;
    case 'shortlists': return <ShortlistsIcon className={className} />;
    case 'compare': return <CompareIcon className={className} />;
    case 'settings': return <SettingsIcon className={className} />;
  }
}
