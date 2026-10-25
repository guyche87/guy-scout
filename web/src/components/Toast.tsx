// Always-mounted live region for toasts (docs/ui-design.md section 12).
import { useCallback } from 'react';
import { dismissToast, pauseToasts, registerToastRegion, resumeToasts, useToasts } from '../lib/toast.ts';

const TITLES = { info: 'Info', success: 'Done', warning: 'Heads up', error: 'Error' } as const;

export function ToastRegion() {
  const items = useToasts();
  const ref = useCallback((el: HTMLDivElement | null) => registerToastRegion(el), []);
  return (
    <div
      ref={ref}
      className="toast-region"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      popover="manual"
      onMouseEnter={pauseToasts}
      onMouseLeave={resumeToasts}
      onFocus={pauseToasts}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resumeToasts();
      }}
    >
      {items.map(t => (
        <div key={t.id} className="toast" data-variant={t.kind} role={t.kind === 'error' ? 'alert' : undefined}>
          <p className="toast__title">{t.title ?? TITLES[t.kind]}</p>
          <p className="toast__msg">{t.message}</p>
          {t.action && (
            <div className="toast__actions">
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  t.action?.run();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            </div>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--icon toast__close"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
          >
            <span className="btn__glyph" aria-hidden="true">×</span>
          </button>
        </div>
      ))}
    </div>
  );
}
