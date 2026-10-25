// Global toast queue usable outside React (the API client reports failures here).
// Info/success auto-dismiss after ~6 s (paused while hovered/focused); errors stay until dismissed.
import { useSyncExternalStore } from 'react';

export type ToastKind = 'info' | 'success' | 'error' | 'warning';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  title?: string;
  /** Optional action button. */
  action?: { label: string; run: () => void };
  /** Auto-dismiss delay, 0 = sticky. */
  ms: number;
}

interface ToastOptions {
  action?: ToastItem['action'];
  ms?: number;
  title?: string;
}

let items: readonly ToastItem[] = [];
let nextId = 1;
let paused = false;
const listeners = new Set<() => void>();
const timers = new Map<number, number>();

function emit(): void {
  for (const l of listeners) l();
}

function arm(t: ToastItem): void {
  if (t.ms <= 0 || paused) return;
  window.clearTimeout(timers.get(t.id));
  timers.set(t.id, window.setTimeout(() => dismissToast(t.id), t.ms));
}

export function dismissToast(id: number): void {
  window.clearTimeout(timers.get(id));
  timers.delete(id);
  const next = items.filter(i => i.id !== id);
  if (next.length !== items.length) {
    items = next;
    emit();
  }
}

export function showToast(kind: ToastKind, message: string, opts: ToastOptions = {}): number {
  // Collapse identical messages that are already visible (e.g. several requests failing at once).
  const dup = items.find(i => i.kind === kind && i.message === message);
  if (dup) {
    arm(dup);
    return dup.id;
  }
  const id = nextId++;
  const ms = opts.ms ?? (kind === 'error' ? 0 : 6000);
  const t: ToastItem = { id, kind, message, title: opts.title, action: opts.action, ms };
  const dropped = items.length >= 5 ? items[0] : null;
  if (dropped) {
    window.clearTimeout(timers.get(dropped.id));
    timers.delete(dropped.id);
  }
  items = [...items.slice(items.length >= 5 ? 1 : 0), t];
  emit();
  arm(t);
  raiseToasts();
  return id;
}

/** Pause auto-dismiss while the user hovers or focuses the region. */
export function pauseToasts(): void {
  paused = true;
  for (const t of timers.values()) window.clearTimeout(t);
  timers.clear();
}

export function resumeToasts(): void {
  paused = false;
  for (const t of items) arm(t);
}

export const toast = {
  info: (m: string, o?: ToastOptions) => showToast('info', m, o),
  success: (m: string, o?: ToastOptions) => showToast('success', m, o),
  warning: (m: string, o?: ToastOptions) => showToast('warning', m, o),
  error: (m: string, o?: ToastOptions) => showToast('error', m, o),
};

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useToasts(): readonly ToastItem[] {
  return useSyncExternalStore(subscribe, () => items, () => items);
}

// ------------------------------------------------------------------ top layer

let regionEl: HTMLElement | null = null;

export function registerToastRegion(el: HTMLElement | null): void {
  regionEl = el;
  raiseToasts();
}

/**
 * The region uses popover="manual" so it can sit above open <dialog>s. Re-showing it moves it to the top of
 * the top layer; call after every showModal().
 */
export function raiseToasts(): void {
  const el = regionEl;
  if (!el || typeof el.showPopover !== 'function') return;
  try {
    if (el.matches(':popover-open')) el.hidePopover();
    el.showPopover();
  } catch {
    // Popover API unavailable or element detached: the region still renders in normal flow.
  }
}
