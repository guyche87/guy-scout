# Guy Scout

A browser-based scouting tool for **Football Manager 2024**, in the spirit of FM Genie Scout.
It reads the running game (read-only) and shows every player, staff member and club, including
hidden attributes, current/potential ability, role ratings, personality, contracts and sale values.

Everything runs locally: a small Node.js server reads FM's memory and serves the UI to Chrome at
<http://localhost:4824>. Nothing is sent anywhere.

## Requirements

- Windows, Football Manager 2024 **24.4.x** (Steam/Epic/Game Pass, 64-bit).
- [Node.js](https://nodejs.org) 22.18 or newer (24 LTS recommended).
- Google Chrome (any modern browser works; Chrome is opened automatically).

## Run it

1. Start FM24 and load your save.
2. Double-click **`start.bat`**. The first run installs dependencies and builds the UI (about a minute).
3. Chrome opens the scout. Click **Load game** — reading ~100k people takes about 10 seconds.
   Click it again whenever you want fresh data after playing on.

Keep the console window open while you use the scout; closing it stops the server.
After pulling new code run `start.bat --rebuild` once to rebuild the UI.

## Features

- Player search with general, contract, attribute, hidden-attribute, personality and role-rating filters.
- Player profile: colour-coded attributes, hidden attributes, CA/PA, projected attributes at potential,
  personality, player traits, position map, all role ratings, contract and release clauses, a short report.
- Staff search and profile with coaching stars and job-suitability ratings.
- Club list and profile with squad, staff and squad aggregates.
- Named shortlists with FM `.slf` import/export (the exported file opens in FM's Load Shortlist), side-by-side compare (up to 4), CSV/HTML export, column chooser.
- Snapshots: save the loaded database to `data/snapshots/` and reopen it later without FM running.

See [docs/genie-scout-capabilities.md](docs/genie-scout-capabilities.md) for a feature-by-feature comparison with Genie Scout.

## Development

```bash
npm install
npm run dev:server   # API on http://localhost:4824 (restarts on change)
npm run dev:web      # Vite dev server on http://localhost:5173 with /api proxied
npm run typecheck
npm run probe -- "Haaland"   # read the live game once and print a summary
```

Layout: `server/fm/` is the memory reader, `server/` the API, `shared/` the data contract and FM logic
(roles, ratings, personality) used by both sides, `web/` the React UI.

## Notes

- Read-only: the scout never writes to FM's memory or your save files.
- Offsets target FM24 24.4.x. Some staff attribute labels are still marked "unverified" in the UI.
