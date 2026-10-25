# Guy Scout

A browser-based scouting tool for **Football Manager 2024**, in the spirit of FM Genie Scout.
It reads the running game (read-only) and shows every player, staff member and club, including
hidden attributes, current/potential ability, role ratings, personality, contracts and sale values.

Everything runs locally: a small server on your PC reads FM's memory and serves the UI to your browser
at <http://localhost:4824>. Nothing is sent anywhere. It can never run as a website — reading the game's
memory has to happen on the same machine as FM.

## Download and run (easiest)

Grab one of these from the [latest release](../../releases/latest) — no install, no Node.js:

- **`GuyScout-Lite.exe`** (~2 MB) — downloads the Node runtime once on first launch (needs internet that first time), then runs offline. Best if you want a small download.
- **`GuyScout.exe`** (~99 MB) — fully self-contained, works offline from the first run.

Start FM24 and load your save, then double-click the exe: it starts the local server and opens your browser
to the scout. Click **Load game** (reading ~100k people takes about 10 seconds).

It creates a `GuyScout-data` folder next to the exe for your settings, shortlists and snapshots.
(The Lite edition caches the Node runtime and the app in `%LOCALAPPDATA%\GuyScout`.)

> Windows will likely show a SmartScreen warning ("unknown publisher") and some antivirus may flag it —
> an unsigned program that reads another app's memory looks like a game trainer. It's safe and read-only;
> click **More info → Run anyway**. Signing it would need a paid certificate.

## Requirements

- Windows x64, Football Manager 2024 **24.4.x** (Steam/Epic/Game Pass).
- A modern browser (Chrome is opened automatically). Nothing else for the `.exe`.

## Run from source (for development)

- [Node.js](https://nodejs.org) 22.18 or newer, then double-click **`start.bat`** (installs deps, builds the UI,
  starts the server, opens the browser). `start.bat --rebuild` rebuilds the UI after a code change.
- Build the standalone exe yourself: `npm run build:exe` → `dist-exe/GuyScout.exe`.

Keep the console window open while you use the scout; closing it stops the server.

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
