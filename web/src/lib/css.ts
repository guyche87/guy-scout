import type { CSSProperties } from 'react';

/** Inline CSS custom properties, e.g. cssVars({ '--ca': 142 }). */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}

/** Joins truthy class names. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
