// Loads the live game once and prints a sanity summary.  Usage: npm run probe [name ...]
import { loadLiveGame } from '../fm/reader.ts';

const t0 = Date.now();
const data = await loadLiveGame(p => { if (p.done % 20000 === 0) console.log(`${p.phase} ${p.done}/${p.total}`); });
console.log(`gameDate ${data.gameDate}, players ${data.players.length}, staff ${data.staff.length}, clubs ${data.clubs.length}, ` +
  `human club ${data.humanClub} (${data.humanClubId}) in ${Date.now() - t0} ms`);
const names = process.argv.slice(2);
const pick = names.length
  ? [...data.players, ...data.staff].filter(p => names.some(n => p.name.toLowerCase().includes(n.toLowerCase())))
  : [...data.players].sort((a, b) => b.ca - a.ca).slice(0, 3);
for (const p of pick) console.log(JSON.stringify(p));
const club = data.clubs.find(c => c.id === data.humanClubId);
if (club) console.log('my club', JSON.stringify(club));
const exp = new Map<string, number>();
for (const p of data.players) { const d = p.contract?.expires?.slice(5); if (d) exp.set(d, (exp.get(d) ?? 0) + 1); }
console.log('most common contract expiry days', [...exp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4));
