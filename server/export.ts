// Player list exports: CSV for spreadsheets and a self-contained HTML table, using sort-key syntax for columns.
import type { ExportRequest } from '../shared/api.ts';
import { ATTR_LABELS, PERSONALITY_LABELS, type PersonalityKey, type PlayerAttrKey } from '../shared/attributes.ts';
import { ROLE_BY_ID, roleLabel } from '../shared/roles.ts';
import type { Player, Settings } from '../shared/types.ts';
import { playerKey, releaseClauseAmount, sortedPlayerHits, splitKey, type Hits, type PlayerSearchCtx } from './search.ts';
import { HttpError, isObject } from './store.ts';

export interface ExportFile {
  body: string;
  contentType: string;
  fileName: string;
}

interface Column {
  label: string;
  numeric: boolean;
  cell: (p: Player, hit: number) => string;
}

const MAX_COLUMNS = 300;

const FIELD_LABELS: Record<string, string> = {
  id: 'ID', name: 'Name', firstName: 'First Name', lastName: 'Last Name', commonName: 'Common Name',
  birthDate: 'Date of Birth', age: 'Age', nations: 'Nationality', nation: 'Nation', club: 'Club', clubId: 'Club ID',
  league: 'League', leagueNation: 'League Nation', continent: 'Continent', onLoan: 'On Loan', loanFromClub: 'Loan From',
  ca: 'Current', pa: 'Potential', growth: 'Growth (Potential - Current)', currentRep: 'Current Reputation', worldRep: 'World Reputation',
  height: 'Height (cm)', weight: 'Weight (kg)', personalityLabel: 'Personality', traits: 'Player Traits',
  value: 'Value', positionText: 'Position', bestPosition: 'Best Position', bestRole: 'Best Role', alsoStaff: 'Also Staff',
  wage: 'Wage (p/w)', expires: 'Contract Expires', transferListed: 'Transfer Listed', loanListed: 'Loan Listed',
  releaseClause: 'Release Clause',
};

/** "leagueNation" -> "League Nation" for fields without an explicit label. */
const humanize = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());

function labelFor(key: string): string {
  const [prefix, arg] = splitKey(key);
  switch (prefix) {
    case 'attr': return ATTR_LABELS[arg as PlayerAttrKey];
    case 'pers': return PERSONALITY_LABELS[arg as PersonalityKey];
    case 'pos': return `${arg} Familiarity`;
    case 'posr': return `${arg} Rating`;
    case 'role': return roleLabel(ROLE_BY_ID[arg]);
    default: return FIELD_LABELS[key] ?? humanize(key);
  }
}

function formatNumber(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
}

function moneyFormatter(s: Settings): (amount: number | null | undefined) => string {
  const nf = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
  return amount => (typeof amount === 'number' && Number.isFinite(amount) ? `${s.currencySymbol}${nf.format(Math.round(amount * s.currencyRate))}` : '');
}

const yesNo = (v: boolean | undefined) => (v ? 'Yes' : 'No');

function column(key: string, players: readonly Player[], hits: Hits, ctx: PlayerSearchCtx, money: ReturnType<typeof moneyFormatter>): Column {
  const col = (numeric: boolean, cell: Column['cell']): Column => ({ label: labelFor(key), numeric, cell });
  switch (key) {
    case 'value': return col(true, p => money(p.value));
    case 'wage': return col(true, p => money(p.contract?.wage));
    case 'releaseClause': return col(true, p => money(releaseClauseAmount(p.contract)));
    case 'expires': return col(false, p => p.contract?.expires ?? '');
    case 'nations':
    case 'nation': return col(false, p => p.nations.join(' / '));
    case 'traits': return col(false, p => p.traits.join(', '));
    case 'onLoan': return col(false, p => yesNo(p.onLoan));
    case 'alsoStaff': return col(false, p => yesNo(p.alsoStaff));
    case 'transferListed': return col(false, p => yesNo(p.contract?.transferListed));
    case 'loanListed': return col(false, p => yesNo(p.contract?.loanListed));
    case 'bestRole': return col(false, p => {
      const r = p.bestRole && ROLE_BY_ID[p.bestRole.id];
      return r ? `${roleLabel(r)} ${formatNumber(p.bestRole.rating)}` : '';
    });
  }
  const spec = playerKey(key, players, hits, ctx.ratingConfig); // validates the key
  return col(spec.kind === 'num', (p, h) => {
    const v = spec.get(p, h);
    return typeof v === 'number' ? (Number.isFinite(v) ? formatNumber(v) : '') : v ?? '';
  });
}

// RFC 4180: quote fields containing a comma, quote or line break; CRLF between records.
const csvField = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

const HTML_CSS = [
  'body{font:13px/1.4 "Segoe UI",system-ui,Arial,sans-serif;margin:16px;color:#1f2328}',
  'h1{font-size:18px;margin:0 0 4px}',
  'p{margin:0 0 12px;color:#59636e}',
  'table{border-collapse:collapse}',
  'th,td{border:1px solid #d1d9e0;padding:3px 7px;white-space:nowrap}',
  'th{background:#f0f3f6;position:sticky;top:0;text-align:left}',
  'tbody tr:nth-child(even) td{background:#f8f9fb}',
  '.n{text-align:right;font-variant-numeric:tabular-nums}',
].join('');

function timestamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Exports every player matching the query (no paging), in the requested order and columns. */
export function exportPlayers(
  players: readonly Player[], req: ExportRequest | undefined, ctx: PlayerSearchCtx, settings: Settings, gameDate: string | null,
): ExportFile {
  if (!isObject(req)) throw new HttpError(400, 'Export request must be a JSON object.');
  const { format, columns } = req;
  if (format !== 'csv' && format !== 'html') throw new HttpError(400, 'format must be "csv" or "html".');
  if (!Array.isArray(columns) || !columns.length || columns.length > MAX_COLUMNS || !columns.every(c => typeof c === 'string' && c)) {
    throw new HttpError(400, `columns must be a list of 1 to ${MAX_COLUMNS} column keys.`);
  }

  const hits = sortedPlayerHits(players, req.query, req.sort, ctx);
  const money = moneyFormatter(settings);
  const cols = (columns as string[]).map(k => column(k, players, hits, ctx, money));
  const now = new Date();
  const fileName = `players_${timestamp(now)}.${format}`;

  if (format === 'csv') {
    const lines = [cols.map(c => csvField(c.label)).join(',')];
    for (let h = 0; h < hits.idx.length; h++) {
      const p = players[hits.idx[h]];
      lines.push(cols.map(c => csvField(c.cell(p, h))).join(','));
    }
    // The BOM makes Excel read the file as UTF-8 instead of the ANSI code page (accents in names).
    return { body: '﻿' + lines.join('\r\n') + '\r\n', contentType: 'text/csv; charset=utf-8', fileName };
  }

  const title = 'Guy Scout - Players';
  const info = `${hits.idx.length} player${hits.idx.length === 1 ? '' : 's'}` +
    (gameDate ? ` · game date ${gameDate}` : '') + ` · exported ${now.toLocaleString('en-GB')}`;
  const out: string[] = [
    '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8">',
    `<title>${esc(title)}</title><style>${HTML_CSS}</style></head><body>`,
    `<h1>${esc(title)}</h1><p>${esc(info)}</p>`,
    '<table><thead><tr>', cols.map(c => `<th${c.numeric ? ' class="n"' : ''}>${esc(c.label)}</th>`).join(''), '</tr></thead><tbody>',
  ];
  for (let h = 0; h < hits.idx.length; h++) {
    const p = players[hits.idx[h]];
    out.push('<tr>' + cols.map(c => `<td${c.numeric ? ' class="n"' : ''}>${esc(c.cell(p, h))}</td>`).join('') + '</tr>\n');
  }
  out.push('</tbody></table></body></html>\n');
  return { body: out.join(''), contentType: 'text/html; charset=utf-8', fileName };
}
