# Guy Scout — notes for Claude Code

Local web scouting tool for Football Manager 2024 (like FM Genie Scout). A Node server reads the running
`fm.exe` memory read-only and serves a React UI. Started by `start.bat`; opened in Chrome. GitHub/Vercel later.

## Architecture
- `server/fm/` — memory reader (Windows only, koffi FFI → kernel32). `win32.ts` bindings, `memory.ts`
  (ReadProcessMemory + 64 KB page cache, AOB scan), `session.ts` (dbtRoot, RTTI class names, names, nations,
  clubs/teams), `people.ts` (players/staff), `reader.ts` (`loadLiveGame`). All layout constants in `offsets.ts`.
- `server/` — Express 5 API (contract in `shared/api.ts`), in-memory store, search, snapshots, export, persistence in `data/` (gitignored).
- `shared/` — types + FM domain logic used by both server and UI: attributes, roles (FM24 key/preferred attributes),
  ratings, personality labels, staff roles/coaching stars. Must stay browser-safe (no Node imports).
- `web/` — React 19 + Vite UI, styles in `web/src/styles/` (design tokens/classes documented in `docs/ui-design.md`).

## Conventions
- Node runs `.ts` directly (type stripping): erasable TS only (no enums/namespaces/parameter properties),
  relative imports include `.ts`, `import type` for types. `npm run typecheck` before committing.
- Never write to FM's process memory or save files. Keep the reader read-only (`PROCESS_VM_READ` only).
- Dev/RE tools live in `server/tools/` (`npm run probe`, `rtti.ts`, `staffjobs.ts`, ...). They need FM running.

## Reverse-engineering status (FM 24.4.2)
- Verified against known players: names, DOB (day-of-year is 1-based), nationality, CA/PA, all 47 player
  attributes + 7 hidden, personality order, positions, height/weight, club/league chain, contract wage (weekly, GBP),
  expiry, staff CA/PA, game date, human manager's club.
- `value` = plao+0x1D0, believed to be Genie Scout's "sale value" (asking price, capped at 300M) — not FM's displayed value.
- Staff attributes: block at staff part +0x32 (raw ×5). Confident: attacking, defending, fitness, technical, tactical,
  JPA/JPP, physio, sports science, analysing data, determination, man management, motivating, tactical knowledge,
  working with youngsters. Labels listed in `STAFF_UNVERIFIED` (shared/attributes.ts) need a check against Genie Scout.
- Job codes (contract +0x1C) are inferred from attribute profiles (`JOB_NAMES` in shared/staffRoles.ts).
- Shortlists: FM/Genie Scout `.slf` is plaintext (magic 03 01, tag "fls.", 3-byte sig 02 00 01, u32 build id, u32-len name, u32 count, u32 player UIDs, trailing 00). Player `id` == FM unique id, so import/export is a direct UID list (server/fm/slf.ts, server/shortlistsFm.ts). FM's own `.fmf` shortlists are encrypted and not read.
- Free agents report value 0 (the raw sale-value field holds the 300M "not for sale" cap when there is no club).
- Not found yet: club finances/facilities, FM's displayed player value, staff tactical preferences (the 1-20 block at staff +0x18), the in-game shortlist structure in memory.
