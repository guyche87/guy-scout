// Display formatting. Money is FM base currency (GBP) multiplied by Settings.currencyRate.
import type { Settings } from '../../../shared/types.ts';

/** FM stores sale values capped at 300M; at or above this the player is effectively not for sale. */
export const SALE_VALUE_CAP = 300_000_000;

export interface MoneyFormat {
  symbol: string;
  rate: number;
}

export const DEFAULT_MONEY: MoneyFormat = { symbol: '£', rate: 1 };

export function moneyFormat(s: Pick<Settings, 'currencySymbol' | 'currencyRate'> | null | undefined): MoneyFormat {
  if (!s) return DEFAULT_MONEY;
  const rate = Number.isFinite(s.currencyRate) && s.currencyRate > 0 ? s.currencyRate : 1;
  return { symbol: s.currencySymbol || '£', rate };
}

function trim(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/** Compact amount without currency: 950, 9.5K, 526K, 45.5M, 1.2B. */
export function compactNumber(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a < 1_000) return sign + String(Math.round(a));
  if (a < 10_000) return sign + trim(a / 1_000, 1) + 'K';
  if (a < 1_000_000) return sign + Math.round(a / 1_000) + 'K';
  if (a < 100_000_000) return sign + trim(a / 1_000_000, 1) + 'M';
  if (a < 1_000_000_000) return sign + Math.round(a / 1_000_000) + 'M';
  return sign + trim(a / 1_000_000_000, 2) + 'B';
}

/** "£45.5M" */
export function money(v: number | null | undefined, f: MoneyFormat = DEFAULT_MONEY): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '–';
  return f.symbol + compactNumber(v * f.rate);
}

/** "£526K p/w" */
export function wage(v: number | null | undefined, f: MoneyFormat = DEFAULT_MONEY): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '–';
  return `${money(v, f)} p/w`;
}

/** Same as wage() without the suffix, for dense table cells with a "p/w" header. */
export function wageShort(v: number | null | undefined, f: MoneyFormat = DEFAULT_MONEY): string {
  return money(v, f);
}

/** Sale value; 300M (FM's cap) means "not for sale" and shows as "£300M+". */
export function saleValue(v: number | null | undefined, f: MoneyFormat = DEFAULT_MONEY): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '–';
  if (v >= SALE_VALUE_CAP) return `${money(SALE_VALUE_CAP, f)}+`;
  return money(v, f);
}

/** Converts a user-entered display amount (e.g. "2M", "500k", "1.5m") back to base currency. */
export function parseMoneyInput(text: string, f: MoneyFormat = DEFAULT_MONEY): number | undefined {
  const t = text.trim().replace(/[,\s]/g, '').replace(/^[^\d.-]+/, '').toLowerCase();
  if (!t) return undefined;
  const m = /^(-?\d*\.?\d+)([kmb])?$/.exec(t);
  if (!m) return undefined;
  const mult = m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : m[2] === 'b' ? 1e9 : 1;
  const display = parseFloat(m[1]) * mult;
  return Number.isFinite(display) ? Math.round(display / f.rate) : undefined;
}

/** Inverse of parseMoneyInput for showing a stored base amount in an input. */
export function moneyInputText(base: number | undefined, f: MoneyFormat = DEFAULT_MONEY): string {
  if (base === undefined || !Number.isFinite(base)) return '';
  return compactNumber(base * f.rate);
}

export function int(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '–';
  return Math.round(v).toLocaleString('en-GB');
}

export function decimal(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '–';
  return v.toFixed(digits);
}

/** Role / position rating 0..100 → "78.5". */
export function rating(v: number | null | undefined): string {
  return decimal(v, 1);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parses yyyy-mm-dd without timezone shifts. */
export function parseIsoDate(iso: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

/** "30 Jun 2025" */
export function date(iso: string | null | undefined): string {
  const p = parseIsoDate(iso);
  if (!p) return '–';
  return `${p.d} ${MONTHS[p.m - 1] ?? '?'} ${p.y}`;
}

/** "30/6/2025" compact for table cells. */
export function dateShort(iso: string | null | undefined): string {
  const p = parseIsoDate(iso);
  if (!p) return '–';
  return `${p.d}/${p.m}/${p.y}`;
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const pad = (n: number) => String(n).padStart(2, '0');

export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** The first 1 July strictly after the game date (or today when unknown), as yyyy-mm-dd. */
export function nextJulyFirst(gameDate: string | null | undefined): string {
  const p = parseIsoDate(gameDate);
  const now = new Date();
  const y = p ? p.y : now.getFullYear();
  const m = p ? p.m : now.getMonth() + 1;
  const d = p ? p.d : now.getDate();
  const afterJuly1 = m > 7 || (m === 7 && d >= 1);
  return isoDate(afterJuly1 ? y + 1 : y, 7, 1);
}

export function bytes(n: number): string {
  if (!Number.isFinite(n)) return '–';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function height(cm: number | null | undefined): string {
  return cm ? `${cm} cm` : '–';
}

export function weight(kg: number | null | undefined): string {
  return kg ? `${kg} kg` : '–';
}

/** FM-style foot strength wording. */
export function footStrength(v: number): string {
  if (v >= 18) return 'Very Strong';
  if (v >= 15) return 'Strong';
  if (v >= 12) return 'Fairly Strong';
  if (v >= 9) return 'Reasonable';
  if (v >= 5) return 'Weak';
  return 'Very Weak';
}

/** "Left", "Right" or "Either" from the hidden foot attributes. */
export function preferredFoot(left: number, right: number): 'Left' | 'Right' | 'Either' {
  if (left >= 15 && right >= 15) return 'Either';
  return left > right ? 'Left' : 'Right';
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${int(n)} ${n === 1 ? one : many}`;
}

export function percent(done: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}
