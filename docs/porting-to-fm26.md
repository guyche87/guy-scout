# Porting Guy Scout to Football Manager 26

A handoff guide so a future session can build the FM26 version **without re-researching from scratch**.
When you're ready: open a session, point it at this file, have **FM26 running with a save loaded**, and ask it
to port Guy Scout to FM26. Most of the project is reusable — the work is almost entirely the **memory layer**.

## TL;DR — what changes vs what stays

| Area | FM24 (now) | FM26 | Work |
|---|---|---|---|
| Process / engine | `fm.exe`, native C++ (MSVC, has RTTI) | **Unity / IL2CPP** — engine in **`game_plugin.dll`** (`fm.exe` returns a Unity build string) | **Rewrite** `server/fm/session.ts` |
| Finding the database root | AOB scan + MSVC RTTI class names | **module base + fixed RVAs** in `game_plugin.dll` (see leads below) | **Rewrite** root/enumeration |
| Field offsets | `server/fm/offsets.ts` | all different | **Re-derive / verify** |
| `.slf` build id | `DEFAULT_FM_BUILD = 0x2bb3c8` | different FM26 build | one constant |
| Everything else | — | — | **reuse as-is** |

**Reused unchanged:** the whole web UI (`web/`), the API (`server/routes.ts`, `search.ts`, `export.ts`,
`snapshots.ts`, `persist.ts`, `store.ts`, `shortlistsFm.ts`), the `.slf` reader/writer (`server/fm/slf.ts`),
the data contract (`shared/types.ts`, `shared/api.ts`), the build/release tooling
(`scripts/build-exe.mjs`, `scripts/build-lite.mjs`, `scripts/launcher.cs`), and most of `shared/` logic.

**Check for changes (FM26 may tweak these):** `shared/attributes.ts` (did FM26 add/remove attributes or
positions?), `shared/roles.ts` (new/removed tactical roles), `shared/staffRoles.ts`.

## The big difference: FM24 is native C++, FM26 is Unity/IL2CPP

FM24's reader (`session.ts`) scans `fm.exe` for an AOB that leads to `dbtRoot`, then walks `std::vector<T*>`
tables and reads **MSVC RTTI** to identify each person's class (`ACTUAL_PLAYER`, `ACTUAL_NON_PLAYER`, …).
**None of that ports directly** — FM26 is a Unity (IL2CPP) title, so there is no MSVC RTTI and the data lives
behind `game_plugin.dll` globals. For FM26 you read a **module base + RVA** to get a root pointer, then a
container/vector, then iterate object pointers. Same *shape* (root → vector of pointers → objects at fixed
offsets), different *mechanics*.

## Concrete FM26 leads to verify FIRST (saves the most time)

These come from community reverse-engineering of **FM26 build 26.3.2+2329565** (repo
`chilliesdev/fmseasonhub-re`, which documents FM26 memory). **Treat as leads to confirm** — RVAs shift every
patch, so they'll likely need re-finding via signatures for the user's exact FM26 build, but the *structure*
and *relative object offsets* are the valuable part.

- **Engine module:** `game_plugin.dll` (query *it* for the version; `fm.exe` gives a Unity string).
- **Root access pattern:** `Root = *(ModuleBase + ROOT_RVA)`, `Container = *(Root + 0x80)`,
  `Begin = *(Container + 0x00)`, `End = *(Container + 0x08)`, `count = (End − Begin) / 8` (array of object ptrs).
- **Root RVAs (game_plugin.dll):** PERSON `0x04E495E0`, CLUB `0x04E49588`, TEAM `0x04E49610`,
  COMP `0x04E495A8`, SAVEGAME `0x04E35F60`, GAME_DATE `0x04DF3C18`.
- **Player object** (720-byte block `0xF8..0x3C7`; "pure player" vs "player-staff" differ by a −0xF8 bias):
  BIRTH_DATE `+0x48`, CURRENT_TEAM_PTR `+0x50`, FEMALE_FLAG `+0x58`, TRAIT_BLOB `+0x60` (32 bytes),
  CONTRACT_PTR `+0xC8`, STATS_PTR `+0x108`, MORALE `+0x22E` / `+0x136`,
  CURRENT_ABILITY `+0x264` / `+0x16C` (uint16, 1..200), POTENTIAL_ABILITY `+0x266` / `+0x16E`,
  PERSON_UID `+0x294` / `+0x19C` (uint32).
- **Not covered by the leads** — must be derived: the ~50 visible+hidden **attribute byte offsets**,
  **positions**, **name/nationality pointer chain**, **contract fields** (wage/expiry/clauses), **club/league
  chain**, **staff attributes**. Use the correlation workflow below.
- **Match data** (if ever wanted): `%LOCALAPPDATA%\Sports Interactive\Football Manager 2026\Temporary\*.obs`,
  zstd-compressed, 214-byte participant blocks.

## How the FM24 layout was derived (repeat this for FM26)

Follow the same method that produced `server/fm/offsets.ts`:
1. **Attach & find the root.** For FM26, get `game_plugin.dll` base, read `*(base + PERSON_ROOT_RVA)` → root →
   `+0x80` container → begin/end vector of person pointers. (If the RVA is stale, re-find via an AOB signature
   around the instruction that references the global.)
2. **Verify against known players.** Read a few famous players by name and check **birthdate, CA/PA, a handful
   of attributes** against reality (this is how FM24 was confirmed with Kroos: born 4 Jan 1990, 183 cm, and
   Haaland CA ~195). If CA/PA/UID/birthdate line up using the leads above, the root is correct.
3. **Map attribute bytes by correlation.** Read a block per player across many players; find the offsets whose
   values sit in 1–20 (or raw ×5 as in FM24) and correlate with known players' profiles. The FM24 run used
   small throwaway scripts in `server/tools/` (a byte-stats/correlation approach) — recreate as needed.
4. **Fill the field map** (names, nationality, contract, club/league) by following pointer chains, same as
   `server/fm/session.ts` / `people.ts` do for FM24.
5. **Guard it.** Keep an `assertLayoutLooksRight()` sanity check (as in `server/fm/reader.ts`) so a wrong
   layout fails loudly instead of showing garbage.

## File-by-file for the FM26 branch

- `server/fm/win32.ts` — add `findModule(pid, 'game_plugin.dll')`; keep the read-only `OpenProcess`/
  `ReadProcessMemory` bindings as-is.
- `server/fm/session.ts` — **rewrite** `attach()` and the root/enumeration to the module-base + RVA model.
  Replace RTTI class detection with FM26's way of distinguishing players/staff (e.g. a type flag/vtable on the
  object, or separate PERSON vs staff roots).
- `server/fm/offsets.ts` — **replace** all FM24 constants with FM26's (process/module name, RVAs, object
  offsets, attribute byte map, contract/club offsets).
- `server/fm/people.ts` / `reader.ts` — adjust to the new object offsets; the overall flow (read person →
  attrs → contract → club chain → build `Player`/`Staff`) stays.
- `server/fm/slf.ts` — set `DEFAULT_FM_BUILD` to the FM26 data build (read it from a `.slf` the FM26 Genie-
  Scout-equivalent writes, as was done for FM24).
- `shared/attributes.ts`, `roles.ts`, `staffRoles.ts` — reconcile with FM26's attribute/role set if changed.
- `scripts/launcher.cs` + build scripts — **no change** (they just package whatever `web/dist` + server bundle
  exist; data dir and FM shortlists folder paths may want "Football Manager 2026" instead of 2024).
- `server/shortlistsFm.ts` + `persist.ts` — update the default FM shortlists folder to the 2026 path.

## Reference projects (open-source, for FM26 memory specifics)

- **FMSuperScout** — `github.com/mavarobli/FMSuperScout` (FM26, JavaScript, reads memory; `docs/fmf-format.md`
  documents the shortlist/.fmf format we also found — confirms `.slf` = header + 4-byte UIDs, `.fmf` encrypted).
- **fmseasonhub-re** — `github.com/chilliesdev/fmseasonhub-re` (the FM26 RVAs/offsets above; also `.obs` match data).
- Our own `docs/genie-scout-capabilities.md` (feature map) and `server/fm/offsets.ts` (the FM24 reference layout).

## Build & release (unchanged)

`npm run build:lite` → `dist-exe/GuyScout-Lite.exe`; `npm run build:exe` → the self-contained 99 MB exe.
Bump `version` in `package.json` (the exe cache key is a content hash, so updates refresh regardless), then
`gh release create vX.Y.Z dist-exe/GuyScout-Lite.exe …`.

## Reality check

The non-memory parts (UI, API, search, export, shortlists, build) will likely work on FM26 **day one** once the
reader produces the same `Player`/`Staff`/`Club` shapes. Budget the effort almost entirely for
`session.ts` + `offsets.ts`: finding the FM26 root for the installed build and mapping the attribute offsets.
With FM26 running and the leads above, that's a focused job, not a from-scratch research project.
