# FM Genie Scout 24 — capability survey and parity plan

Research done 2026-10-24 before building Web Genie Scout 24. Sources: FM Scout's
[GS24 release notes](https://www.fmscout.com/a-genie-scout-24-now-available.html),
[GS24 "g" edition page](https://www.fmscout.com/a-genie-scout-24g-edition.html) and the
[Genie Scout guide](https://www.fmscout.com/a-genie-scout-guide.html), plus the local install in `C:\FM Genie Scout 24_\`.

## How Genie Scout gets its data

- Reads FM's **process memory** while the game runs with a save loaded (read-only; it cannot edit).
  The install ships a 32-bit UI (`FMGenieScout.exe`) and a 64-bit reader (`FMGenieScoutProxy_x64.exe`);
  build 1415 targets FM 24.4.2, the final FM24 patch.
- `FMGenieScoutStatsAgent_x64.exe` collects anonymous in-game statistics for the paid "GS STATS" feature.

## Feature list

| Area | Genie Scout 24 | Web Genie Scout 24 v1 |
|---|---|---|
| Load game | Attach to running FM | ✅ Attach to running FM (read-only) |
| Player search | General / contract / attribute / hidden / preferred-moves filters | ✅ Same groups + role-rating filter |
| Columns | Sortable, configurable, saved layouts | ✅ Column chooser, saved per browser |
| Player profile | Attributes (colour-coded), hidden attributes, CA/PA, sale value, personality, positions 0-20, ratings, Genie's report, history, compare | ✅ All except history |
| Projected attributes at PA | Estimate | ✅ Heuristic estimate |
| Role ratings | 100+ roles & duties (g edition) | ✅ ~80 FM24 role/duty combinations, editable |
| Position ratings | General / positional | ✅ Best rating per position + familiarity |
| Rating systems | Custom weighted rating files | ✅ Editable key/preferred weights and per-role attribute lists |
| Staff search & profile | Coaching stars, hidden attributes, job ratings | ✅ (some staff byte labels still unverified — see CLAUDE.md) |
| Club list & profile | Info, facilities, finances, kits, tactic rating | ✅ Squad, staff and aggregates. Finances/facilities: later |
| Shortlists | Save/load, import/export FM shortlists | ✅ Named shortlists + FM `.slf` import/export (FM opens the exported file) |
| Compare players | Two players | ✅ Up to four |
| Export | HTML, Excel, TXT | ✅ CSV (opens in Excel), HTML, and FM `.slf` shortlist |
| History points | Attribute snapshots over time | Snapshots of the whole DB (JSON) exist; per-player history view: later |
| Top lists (g) | Best / most promising / bargains | Later |
| GS STATS, development probability, progress rate (g) | Statistical model from many games | Out of scope (needs SI-wide data) |
| In-game scout popup (g) | Injects into FM's UI | Out of scope (would require writing to FM's memory) |
| Facepacks / kits | Shown in profiles | Later |

## Data model facts discovered while building

- FM24's database root (`dbtRoot`) holds `std::vector<T*>` tables: awards, cities, clubs (26,830),
  competitions, continents, nations (251), persons (~99,800), teams (~64,500) and more.
- Person objects carry MSVC RTTI, so the class of every entry is known: `ACTUAL_PLAYER`,
  `ACTUAL_NON_PLAYER` (staff), `ACTUAL_PLAYER_AND_NON_PLAYER` (player-coaches), `HUMAN_NON_PLAYER` (you), officials, agents,
  journalists, retired people, virtual players.
- Full layout reference with offsets: `server/fm/offsets.ts`.
