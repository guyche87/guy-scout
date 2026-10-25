import type { ReactNode } from 'react';
import { cssVars, cx } from '../lib/css.ts';
import { int, percent } from '../lib/format.ts';

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, children, actions, compact }: EmptyStateProps) {
  return (
    <div className={cx('empty-state', compact && 'empty-state--compact')}>
      {icon && <div className="empty-state__icon" aria-hidden="true">{icon}</div>}
      <h2 className="empty-state__title">{title}</h2>
      {children && <div className="empty-state__text">{children}</div>}
      {actions && <div className="empty-state__actions">{actions}</div>}
    </div>
  );
}

export function Spinner({ size = 'md', label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const el = <span className={cx('spinner', size === 'sm' && 'spinner--sm', size === 'lg' && 'spinner--lg')} aria-hidden="true" />;
  if (!label) return el;
  return (
    <span role="status">
      {el}
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="empty-state empty-state--compact" role="status">
      <span className="spinner spinner--lg" aria-hidden="true" />
      <span className="empty-state__text">{label}</span>
    </div>
  );
}

interface CalloutProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  alert?: boolean;
}

export function Callout({ variant = 'info', title, children, actions, alert }: CalloutProps) {
  return (
    <div className="callout" data-variant={variant} role={alert ? 'alert' : undefined}>
      <div className="callout__content">
        <p className="callout__title">{title}</p>
        {children && <div className="callout__body">{children}</div>}
      </div>
      {actions && <div className="callout__actions">{actions}</div>}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Callout
      variant="error"
      title="Something went wrong"
      alert
      actions={onRetry && <button type="button" className="btn btn--sm" onClick={onRetry}>Retry</button>}
    >
      {message}
    </Callout>
  );
}

interface ProgressProps {
  label: string;
  done: number;
  total: number;
  large?: boolean;
}

/** Determinate bar when total is known, indeterminate otherwise. */
export function Progress({ label, done, total, large }: ProgressProps) {
  const known = total > 0;
  const pct = known ? percent(done, total) : 0;
  return (
    <div
      className={cx('progress', large && 'progress--lg', !known && 'progress--indeterminate')}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={known ? pct : undefined}
      aria-valuetext={known ? `${int(done)} of ${int(total)}` : 'Working'}
      style={cssVars({ '--value': pct })}
    >
      <div className="progress__label">
        <span>{label}</span>
        <span className="progress__value">{known ? `${int(done)} / ${int(total)}` : '…'}</span>
      </div>
      <div className="progress__track">
        <div className="progress__bar" />
      </div>
    </div>
  );
}
