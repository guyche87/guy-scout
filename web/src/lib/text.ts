const MARKS = /[̀-ͯ]/g;
const SPECIAL: Record<string, string> = { 'ø': 'o', 'ł': 'l', 'đ': 'd', 'ð': 'd', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ı': 'i' };

/** Lowercase, accent-free text for client-side matching (mirrors the server's fold()). */
export function fold(s: string): string {
  return s.normalize('NFD').replace(MARKS, '').toLowerCase().replace(/[øłđðßæœı]/g, c => SPECIAL[c] ?? c);
}

/** True when every word of `query` occurs in `text` (both folded). */
export function matchesWords(text: string, query: string): boolean {
  const q = fold(query).split(/\s+/).filter(Boolean);
  if (!q.length) return true;
  const t = fold(text);
  return q.every(w => t.includes(w));
}

/** Two-letter monogram for avatar blocks. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
