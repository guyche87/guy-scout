// FM date helpers (platform independent).

/** FM stores dates as (day-of-year starting at 1, year). */
export function dayOfYearToIso(year: number, day: number): string | null {
  if (year < 1900 || year > 2200 || day < 1 || day > 366) return null;
  return new Date(Date.UTC(year, 0, day)).toISOString().slice(0, 10);
}

export function ageOn(birthIso: string | null, onIso: string | null): number {
  if (!birthIso || !onIso) return 0;
  const [by, bm, bd] = birthIso.split('-').map(Number);
  const [y, m, d] = onIso.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age--;
  return age;
}
