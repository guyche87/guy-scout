# Web Genie Scout 24 - UI design contract

This document is the contract between the stylesheets in `web/src/styles/` and the React UI in
`web/src/`. **Use only the classes, attributes and CSS variables listed here.** If something is
missing, add it to `components.css` (built from tokens) and document it here. Do not use inline
colours or one-off styles.

Look and feel: **Football Manager 2024's default dark skin**.
* Navigation: a purple gradient sidebar with orange for the active item.
* Header: near-black purple, with a violet "CONTINUE"-style CTA and an amber in-game date.
* Content: charcoal, with orange uppercase condensed section titles and grey uppercase table headers.
* Tables: two-line "comfortable" rows (dense rows are also available), grey value pills, and
  FM-coloured attribute numbers.

Chrome only, desktop-first (1024px and up), works on tablets from 768px. The FM shell classes are
in section 5.1.

---

## 0. Ground rules

1. **Load order** (in `web/src/main.tsx`): `tokens.css`, then `base.css`, then `components.css`.
2. Snippets below are HTML with `class`. In JSX, write `className`.
3. **State goes in ARIA or `data-*` attributes**: `aria-sort`, `aria-selected`, `aria-pressed`,
   `aria-checked`, `aria-current`, `aria-expanded`, `aria-busy`, `data-state`, `data-tier`, `data-fam`,
   `data-variant`, `data-filters`, `data-cols`, `data-emphasis`. Only four state classes exist:
   `.is-selected`, `.is-best`, `.is-worst` and `.is-unverified`.
4. **Pass numbers to CSS as unitless custom properties** on the element itself:
   `style={{ '--value': 78 } as React.CSSProperties}`.
5. **Do not rely on colour alone.** Every graded value prints its number. Every state has a text label
   or a shape cue (arrow, bar, dashed ring, check mark). Keep both when you build on these classes.
6. **Icons**: use inline SVG with `class="icon"` (or `btn__icon`) and `aria-hidden="true"`, or the
   text glyphs named here (`×`, `‹`, `›`, `↑`). No icon fonts and no CDNs: the app runs offline.
   **Fonts are bundled locally.** `main.tsx` imports `@fontsource/roboto/400.css`, `500.css`,
   `700.css` and `@fontsource/roboto-condensed/700.css`. Roboto is the body font; Roboto Condensed
   700 is used for uppercase titles and table headers. Only weights 400, 500 and 700 exist, so
   `--fw-semibold` is 500.
7. Labels are English. Numbers are formatted with `Intl.NumberFormat`. Money uses
   `Settings.currencySymbol` and `Settings.currencyRate`.

## 1. Files

| File | Contents |
|---|---|
| `web/src/styles/tokens.css` | Custom properties: dark theme on `:root`, light theme on `:root[data-theme="light"]` |
| `web/src/styles/base.css` | Reset, body typography, thin themed scrollbars, `:focus-visible`, reduced motion, utilities |
| `web/src/styles/components.css` | Every component class in this document |

## 2. Theming and tokens

* Dark is the default. Switch with `document.documentElement.dataset.theme = 'light'`. Go back with
  `delete document.documentElement.dataset.theme` (or set it to `'dark'`). Persist the choice in
  `localStorage` and apply it in `main.tsx` before the first render to avoid a flash.
  For a "System" option, resolve `matchMedia('(prefers-color-scheme: light)')` in JS and set the attribute.
* `color-scheme` is set per theme, so native date pickers, select pop-ups and scrollbars follow it.
* Token groups (full list and contrast notes in `tokens.css`):

| Group | Tokens |
|---|---|
| Type | `--font-sans` (Roboto, Segoe UI, system-ui), `--font-condensed` (Roboto Condensed 700), `--font-mono`, `--font-symbol`, `--font-numeric` (tabular-nums), `--fs-2xs` 10.5 · `--fs-xs` 11 · `--fs-sm` 12 · `--fs-table` 12.5 · `--fs-base` 13 · `--fs-md` 14 · `--fs-section` 14 · `--fs-lg` 16 · `--fs-title` 17 · `--fs-xl` 19 · `--fs-2xl` 23 · `--fs-3xl` 28, `--fw-regular` 400 / `--fw-medium` 500 / `--fw-semibold` 500 / `--fw-bold` 700, `--lh-*`, `--tracking-caps` |
| FM chrome (same in both themes) | `--fm-sidebar-bg` (purple gradient), `--fm-sidebar-fg/-muted/-sep/-hover/-active-bg/-active`, `--fm-badge-alert`, `--fm-header-bg/-solid/-fg/-sub/-border`, `--fm-tab-indicator`, `--fm-date`, `--fm-cta-bg/-bg-hover/-bg-active/-fg`, sizes `--fm-sidebar-w` 176 / `--fm-sidebar-w-collapsed` 56 / `--fm-sidebar-item-h` 36 / `--fm-header-h` 56 / `--fm-subtabs-h` 40 / `--cta-h` 40 |
| Violet | `--violet`, `--violet-solid(-hover/-active)`, `--violet-soft`, `--on-violet` (selection, CTA family) |
| FM extras | `--pill-bg/-fg` (value pills, chips, neutral badges), `--btn-outline`, `--card-border`, `--tab-indicator`, `--profile-header-bg`, `--table-header-rule`, `--radius-btn` |
| Space | `--space-0`, `--space-px`, `--space-0-5` (2px), `--space-1` (4px), `--space-1-5`, `--space-2` (8px), `--space-2-5`, `--space-3`, `--space-4` (16px), `--space-5`, `--space-6`, `--space-8`, `--space-10`, `--space-12` |
| Radius | `--radius-xs/sm/md/lg/xl/pill` |
| Sizes | `--topbar-h`, `--nav-h`, `--sidebar-w` (300), `--sidebar-drawer-w`, `--drawer-w` (720), `--modal-w-sm/md/lg`, `--popover-w`, `--control-h-sm/-/-lg` (24/28/32), `--icon-size(-sm)`, `--hit-min` (24) |
| Table | `--row-h-compact` 22 · `--row-h` 26 · `--row-h-comfy` 52 (two-line FM rows) · `--row-h-header` 30 · `--row-h-header-comfy` 34 · `--row-h-group` 20, `--cell-pad-x`, `--col-attr-w`, `--attr-size-sm/-/-lg` (18/22/26) |
| Surfaces | `--bg-app` #1b1b1d (page), `--surface-1` #202023 (filter sidebar, drawer) · `--surface-2` #252528 (cards, section bars) · `--surface-3` (popovers) · `--surface-4` (pressed/tracks), `--surface-input`, `--overlay`, `--hover-overlay(-strong)` |
| Text | `--text-1`, `--text-2`, `--text-3` (muted, AA on surface-1..3), `--text-disabled`, `--text-inverse`, `--text-link` |
| Border | `--border-subtle`, `--border`, `--border-strong`, `--border-control` (3:1 for inputs), `--border-control-hover` |
| Accent (FM orange) | `--accent` (section titles, active markers), `--accent-solid(-hover/-active)` (primary buttons, checked boxes), `--accent-border`, `--accent-soft(-strong)`, `--on-accent` (near-black) |
| Semantic | `--positive`, `--negative`, `--warning`, `--info`, each with `-solid`, `-soft`, `--on-*` |
| Focus | `--focus-ring`, `--focus-width`, `--focus-offset`, `--selection-bg` |
| Rows | `--table-header-bg/fg`, `--cell-border`, `--row-bg`, `--row-bg-alt`, `--row-hover`, `--row-selected(-hover)`, `--row-selected-bar` |
| Tiers | `--tier-{0..5}-bg`, `--tier-{0..5}-fg`, `--tier-{0..5}-line`, `--tier-5-ring`, `--tile-edge`, `--bar-track` |
| Pitch | `--pitch-grass(-alt)`, `--pitch-line`, `--pitch-text`, `--pitch-focus`, `--fam-*` (theme independent) |
| Misc | `--star-on/off`, `--scrollbar-*`, `--shadow-sm/md/lg/inset`, `--dur-fast/base/slow`, `--ease-out/in-out` |
| Z-index | `--z-base` 0 · `--z-raised` 1 · `--z-sticky-cell` 2 · `--z-sticky` 10 · `--z-sticky-corner` 12 · `--z-overlay-local` 20 · `--z-topbar` 100 · `--z-dropdown` 200 · `--z-drawer` 300 · `--z-modal` 400 · `--z-toast` 500 · `--z-tooltip` 600 |

## 3. Breakpoints and responsive behaviour

CSS variables can't be used in media queries. Use these exact numbers in JS too, e.g.
`matchMedia('(min-width: 1100px)')`. Queries use `max-width: N - 0.02px`.

| Viewport | Behaviour |
|---|---|
| >= 1100px | Filter sidebar is a 300px column (`.layout-search`). `data-filters="closed"` hides it. |
| < 1100px | `.fm-sidebar` collapses to icons only (56px) unless `data-collapsed="false"`. The filter sidebar becomes a left drawer (340px, max 92vw) opened with `data-filters="open"`. `.show-below-1100` appears; `.hide-below-1100` disappears. |
| >= 900px | Profile drawer is 720px wide (`--drawer-w`). |
| < 900px | Profile drawer is full width. `.fm-header` hides its subtitle, crest and the weekday line of the date, and `.fm-cta` gets narrower. The legacy topbar hides `.topbar__version` and `.topbar__meta`. `.btn__label--collapsible` and `.hide-below-900` are hidden. |
| < 768px | `.kv--cols-2` collapses to one column. `.nav-tabs` and `.tabs` always scroll sideways when they overflow. |

The attribute grid needs no breakpoints: `.attr-grid` auto-fits 1 to 4 columns to its container.

## 4. Value tiers (`data-tier`)

One 5-step palette covers every graded number. Only the thresholds differ by scale:

| `data-tier` | Meaning | Attribute 1-20 | Rating 0-100 % | CA / PA 1-200 |
|---|---|---|---|---|
| `1` | Poor | 1-5 | 0-29 | 1-89 |
| `2` | Below average | 6-10 | 30-54 | 90-119 |
| `3` | Decent | 11-14 | 55-74 | 120-139 |
| `4` | Good | 15-17 | 75-89 | 140-159 |
| `5` | Elite | 18-20 | 90-100 | 160-200 |
| *(none)* or `0` | No data / not graded | - | - | - |

* Rating thresholds are the attribute thresholds × 5, so an 80% role rating has the colour of a 16
  attribute. CA/PA thresholds follow football meaning: 160+ is world class, 140+ a top-league starter,
  120+ a solid top-flight player, 90+ second tier.
* **FM look: coloured numbers, not filled tiles.**

  | Tier | Number colour (dark theme) | Weight | Extra |
  |---|---|---|---|
  | 1 | dim red-grey | regular | |
  | 2 | light grey | regular | |
  | 3 | light green | medium | |
  | 4 | green | bold | |
  | 5 | bright green | bold | subtle green capsule + ring |

* **Accessibility of the palette.** Three things rise with the tier: lightness (L* 64 / 72 / 79 /
  85 / 93 in dark), font weight, and, at tier 5, a background shape. Tiers stay distinct without
  any hue perception. Every number is at least 4.5:1 on every row state, including selected and hover.
  In the light theme lightness falls with the tier instead (pale = poor).
* Need tiles? Add `.attr--tile` / `.rating--tile` / `.ability--tile` for a subtle opaque tile
  behind the coloured number (section 9).
* **Inverted keys** (a high number is bad): `dirtiness`, `injuryProneness`, `controversy` and staff
  `interference`. Compute the tier on `21 - value`, but print the real value. Add `title="Lower is better"`.
* **Missing values** (`null`, `undefined`, or 0 for a 1-20 attribute): render the element without
  `data-tier`, with the text `–` (en dash).
* `data-tier` works on any element. It sets `--tile-fg`, `--tile-bg`, `--tile-line`,
  `--tile-weight` and `--tile-capsule` for that element and its children. So
  `<li class="meter-row" data-tier="4">` colours both the meter and the rating inside it.

Copy this helper verbatim into `web/src/lib/tiers.ts` (adjust the import path or alias):

```ts
import { FAMILIARITY } from '../../../shared/attributes.ts';

export type Tier = 1 | 2 | 3 | 4 | 5;

/** 1-20 attribute (player, staff, personality, hidden). `invert` for "lower is better" keys. */
export function attrTier(value: number, invert = false): Tier {
  const v = invert ? 21 - value : value;
  if (v >= 18) return 5;
  if (v >= 15) return 4;
  if (v >= 11) return 3;
  if (v >= 6) return 2;
  return 1;
}

/** 0-100 role / position / staff-role rating. Rounded first so the colour matches the printed number. */
export function ratingTier(pct: number): Tier {
  const v = Math.round(pct);
  if (v >= 90) return 5;
  if (v >= 75) return 4;
  if (v >= 55) return 3;
  if (v >= 30) return 2;
  return 1;
}

/** 1-200 current or potential ability. */
export function abilityTier(v: number): Tier {
  if (v >= 160) return 5;
  if (v >= 140) return 4;
  if (v >= 120) return 3;
  if (v >= 90) return 2;
  return 1;
}

/** Keys where a high value is bad: the colour is inverted, the printed number is not. */
export const INVERTED_KEYS: ReadonlySet<string> = new Set([
  'dirtiness', 'injuryProneness', 'controversy', 'interference',
]);

/** For 1-20 tiles: the data-tier string, or undefined (neutral tile showing "–") when there is no value. */
export function attrTierFor(key: string, value: number | null | undefined): string | undefined {
  if (value == null || value <= 0) return undefined;
  return String(attrTier(value, INVERTED_KEYS.has(key)));
}

export type Familiarity =
  | 'natural' | 'accomplished' | 'competent' | 'unconvincing' | 'awkward' | 'ineffectual';

/** 0-20 position familiarity -> data-fam (thresholds from shared/attributes.ts). */
export function familiarity(v: number): Familiarity {
  if (v >= FAMILIARITY.natural) return 'natural';
  if (v >= FAMILIARITY.accomplished) return 'accomplished';
  if (v >= FAMILIARITY.competent) return 'competent';
  if (v >= FAMILIARITY.unconvincing) return 'unconvincing';
  if (v >= FAMILIARITY.awkward) return 'awkward';
  return 'ineffectual';
}
```

---

## 5. Layout

### `.app-shell`: header + nav + main

| Class | Notes |
|---|---|
| `.app-shell` | Full-viewport grid. Rows: header (`.fm-header` or legacy `.topbar`) / sub-tabs (`.fm-subtabs` or legacy `.app-nav`) / `.app-main`. A direct `.fm-sidebar` child adds a left column spanning all rows (section 5.1). Nothing outside it scrolls. |
| `.app-nav` | Nav row holding `.nav-tabs`. `.app-nav__aside` sits at the right edge (quick search, compare tray count). |
| `.app-main` | Fills the remaining height (`overflow: hidden`). Its child is `.layout-search`, `.results` or `.page`. |
| `.page`, `.page__inner`, `.page__header`, `.page__title`, `.page__subtitle`, `.page__actions` | Scrolling document page (Settings, Shortlists overview, Compare). `.page__inner` is capped at 1080px. `.page--wide` removes the cap. |

```html
<div class="app-shell">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="topbar">…</header>
  <nav class="app-nav" aria-label="Main">
    <ul class="nav-tabs">…</ul>
    <div class="app-nav__aside">…</div>
  </nav>
  <main class="app-main" id="main" tabindex="-1">…</main>
</div>
```

### `.topbar`

Elements: `__brand`, `__logo`, `__version`, `__status`, `__meta`, `__spacer`, `__actions`.

```html
<header class="topbar">
  <a class="topbar__brand" href="#/players">
    <span class="topbar__logo" aria-hidden="true">GS</span>
    Web Genie Scout 24 <span class="topbar__version">v0.1</span>
  </a>
  <div class="topbar__status">
    <span class="pill-status" data-state="connected" role="status">…</span>
    <span class="topbar__meta">Game date 14 Aug 2024 · 48,213 players · 9,870 staff</span>
  </div>
  <div class="topbar__spacer"></div>
  <div class="topbar__actions">
    <button class="btn btn--primary btn--sm" type="button" aria-label="Reload from FM">
      <svg class="btn__icon" aria-hidden="true">…</svg>
      <span class="btn__label--collapsible">Reload from FM</span>
    </button>
    <button class="btn btn--secondary btn--sm" type="button">Snapshots</button>
    <button class="btn btn--ghost btn--sm btn--icon" type="button" aria-label="Use light theme">…</button>
  </div>
</header>
```

A button whose label is `.btn__label--collapsible` must carry an `aria-label` with the same text,
because the label is hidden below 900px.

### `.nav-tabs`: main navigation

These are **route links**, not ARIA tabs. Mark the active one with `aria-current="page"` and never
use `role="tab"` here. Items: Players, Staff, Clubs, Shortlists, Compare, Settings.

```html
<ul class="nav-tabs">
  <li class="nav-tabs__item">
    <a class="nav-tabs__link" href="#/players" aria-current="page">Players <span class="nav-tabs__count">48,213</span></a>
  </li>
  <li class="nav-tabs__item"><a class="nav-tabs__link" href="#/compare">Compare <span class="nav-tabs__count">3</span></a></li>
  …
</ul>
```

### `.layout-search`: filters sidebar + results

| Class / attribute | Notes |
|---|---|
| `.layout-search` | Grid: 300px sidebar + results. |
| `data-filters="open" \| "closed"` | **>= 1100px:** sidebar column; `closed` hides it (default: open). **< 1100px:** off-canvas left drawer; `open` slides it in (default: closed). |
| `.layout-search__sidebar` | Holds `.filter-panel`. Give it an `id` for `aria-controls`. |
| `.layout-search__scrim` | Must be a **direct child**. Visible only when the drawer is open below 1100px. Clicking it closes the drawer. |
| `.layout-search__results` / `.results` | Flex column: `.toolbar`, `.results__body`, `.toolbar.toolbar--footer`. Use `.results` on its own for pages without filters (e.g. a shortlist). |
| `.results__body` | Positioned, fills the space. Holds `.table-scroll`, `.loading-overlay` or `.empty-state`. |

```html
<div class="layout-search" data-filters="open">
  <aside class="layout-search__sidebar" id="player-filters" aria-label="Player filters">
    <div class="filter-panel">…</div>
  </aside>
  <div class="layout-search__scrim" aria-hidden="true"></div>
  <section class="layout-search__results" aria-label="Results">
    <div class="toolbar">…</div>
    <div class="results__body">
      <div class="table-scroll table-scroll--flush" role="region" aria-label="Player results" tabindex="0">…</div>
      <div class="loading-overlay" hidden><span class="spinner"></span> Searching…</div>
    </div>
    <div class="toolbar toolbar--footer"><nav class="pagination" aria-label="Pagination">…</nav></div>
  </section>
</div>
```

Behaviour:

* Initial value: `matchMedia('(min-width: 1100px)').matches ? 'open' : 'closed'`. Re-apply it on the
  query's `change` event.
* The toggle button lives in the toolbar:
  `<button class="btn btn--secondary btn--sm" aria-expanded="true" aria-controls="player-filters">Filters <span class="badge badge--accent badge--count">3</span></button>`.
* Below 1100px, while the drawer is open:
  * Move focus into the panel (its title with `tabindex="-1"`, or the first field).
  * Close on **Esc** and on scrim click.
  * Set `inert` on `.layout-search__results`.
  * Return focus to the toggle when the drawer closes.

---

## 5.1 FM24 shell (sidebar, header, sub-tabs, section titles, value pills)

The preferred shell replaces `.topbar` + `.nav-tabs`; the legacy classes still work and now look
the same. The sidebar, header, sub-tabs and drawer header form a **dark chrome scope**: buttons,
pills, inputs and popovers placed inside them automatically use the dark palette, in both themes.

```html
<div class="app-shell">
  <a class="skip-link" href="#main">Skip to content</a>

  <nav class="fm-sidebar" aria-label="Main">            <!-- data-collapsed="true|false" optional -->
    <a class="fm-sidebar__brand" href="#/players"><span class="fm-sidebar__logo" aria-hidden="true">GS</span>
      <span class="fm-sidebar__label">Genie Scout 24</span></a>
    <ul class="fm-sidebar__group">
      <li><a class="fm-sidebar__item" href="#/players" aria-current="page" title="Players">
        <svg class="fm-sidebar__icon" aria-hidden="true">…</svg><span class="fm-sidebar__label">Players</span></a></li>
      <li><a class="fm-sidebar__item" href="#/staff" title="Staff">…<span class="fm-sidebar__label">Staff</span></a></li>
      <li><a class="fm-sidebar__item" href="#/clubs" title="Clubs">…</a></li>
    </ul>
    <ul class="fm-sidebar__group">                       <!-- thin separator between groups -->
      <li class="fm-sidebar__heading">Lists</li>          <!-- optional; hidden when collapsed -->
      <li><a class="fm-sidebar__item" href="#/shortlists">…<span class="fm-sidebar__label">Shortlists</span></a></li>
      <li><a class="fm-sidebar__item" href="#/compare">…<span class="fm-sidebar__label">Compare</span>
        <span class="fm-sidebar__badge">3<span class="visually-hidden"> players</span></span></a></li>
    </ul>
    <div class="fm-sidebar__footer">
      <a class="fm-sidebar__item" href="#/settings">…<span class="fm-sidebar__label">Settings</span></a>
    </div>
  </nav>

  <header class="fm-header">
    <div class="fm-header__nav">
      <button class="fm-header__arrow" type="button" aria-label="Back">‹</button>
      <button class="fm-header__arrow" type="button" aria-label="Forward" disabled>›</button>
    </div>
    <div class="fm-header__titles">
      <svg class="fm-header__title-icon" aria-hidden="true">…</svg>
      <div class="fm-header__text">
        <h1 class="fm-header__title">Players</h1>
        <p class="fm-header__subtitle">48,213 players · live from FM 2024</p>
      </div>
    </div>
    <div class="fm-header__spacer"></div>
    <div class="fm-header__tools">
      <span class="pill-status" data-state="connected" role="status">…</span>
      <button class="btn btn--ghost btn--icon" type="button" aria-label="Use light theme">…</button>
    </div>
    <div class="fm-header__date">
      <span class="visually-hidden">In-game date:</span>
      <span class="fm-header__date-day">Wed 23:00</span>
      <span class="fm-header__date-full">19 May 2027</span>
    </div>
    <button class="fm-cta" type="button">Reload</button>  <!-- » chevrons are drawn by CSS -->
  </header>

  <nav class="fm-subtabs" aria-label="Players views">     <!-- or role="tablist" with role="tab" buttons -->
    <a class="fm-subtabs__tab" href="#/players" aria-current="page">Search</a>
    <a class="fm-subtabs__tab" href="#/players/top">Top by role <span class="fm-subtabs__caret"></span></a>
    <div class="fm-subtabs__aside">…</div>
  </nav>

  <main class="app-main" id="main" tabindex="-1">…</main>
</div>
```

| Class | Notes |
|---|---|
| `.fm-sidebar` | Purple gradient column, 176px. Icons only (56px) **below 1100px**, or with `data-collapsed="true"`. `data-collapsed="false"` keeps labels on narrow screens. Labels stay readable by screen readers when collapsed; add `title` to each item for a hover tooltip. |
| `.fm-sidebar__brand`, `__logo` | Top block, same height as the header. |
| `.fm-sidebar__group`, `__heading` | `<ul>` groups separated by thin lines. The heading is optional. |
| `.fm-sidebar__item` (`<a>`/`<button>`) | 36px row: `.fm-sidebar__icon` (18px SVG, currentColor) + `.fm-sidebar__label`. The active item has **`aria-current="page"`**: orange icon and label, a lighter background and a small orange corner marker. |
| `.fm-sidebar__badge` | Red count bubble over the icon. Add visually hidden context text. |
| `.fm-sidebar__footer` | Pinned to the bottom (settings, theme toggle). |
| `.fm-header` | 56px near-black purple bar. |
| `.fm-header__nav`, `__arrow` | Back/forward buttons. They need an `aria-label`; use `disabled` when not possible. |
| `__crest` | Optional logo slot. |
| `__titles`, `__title-icon`, `__text`, `__title`, `__subtitle` | Framed title panel. The title is white, 17px, medium weight; the subtitle is grey, 12px. Use one `<h1>` per page. |
| `__spacer`, `__tools` | Push the right side; holds icon buttons and `.pill-status`. |
| `__date`, `__date-day`, `__date-full` | In-game date in amber on two lines (weekday + time, then the bold date), with corner brackets. Source: `Status.gameDate`. |
| `.fm-cta` | Big violet uppercase button with `»` chevrons drawn by CSS. Use it for LOAD GAME / RELOAD / CONTINUE, **one per header**. Supports `disabled`, `aria-busy="true"` (spinner) and `.fm-cta--sm`. With `.btn__label--collapsible` inside, add an `aria-label`. |
| `.fm-subtabs` | 40px row of white text tabs under the header, on the same background. |
| `.fm-subtabs__tab` | A route link (`aria-current="page"`) or an ARIA tab (`role="tab"` + `aria-selected`, with arrow-key behaviour as in section 10). The active tab gets a white underline and medium weight. |
| `.fm-subtabs__item` | Optional `<li>` wrapper. |
| `__count`, `__caret` | Optional count and dropdown caret. |
| `__aside` | Right-aligned extras. |

Content-area FM pieces:

```html
<div class="fm-section-bar">
  <h2 class="fm-section-title">Players in range</h2>
  <div class="fm-section-bar__actions">
    <span class="eyebrow">Interested in:</span>
    <label class="checkbox"><input type="checkbox" checked> Transfer</label>
    <label class="checkbox"><input type="checkbox"> Loan</label>
    <button class="btn btn--sm" type="button">Quick Search ▾</button>
    <button class="btn btn--sm" type="button">Clear</button>
    <button class="btn btn--primary btn--sm" type="button">New Search</button>
  </div>
</div>

<div class="fm-section-bar fm-section-bar--plain">
  <h2 class="fm-section-title">6,374 players found (filtered)</h2>
  <button class="btn btn--sm" type="button" aria-haspopup="menu">Overview ▾</button>
</div>

<span class="value-pill value-pill--wide"><span class="value-pill__knob" aria-hidden="true"></span>€400K - €3.9M</span>
<span class="value-pill value-pill--wide value-pill--outline value-pill--muted">Not for Sale</span>

<div class="fm-kpis">
  <div class="fm-kpi">
    <span class="fm-icon-badge" aria-hidden="true"><svg>…</svg></span>
    <div class="fm-kpi__text">
      <span class="fm-kpi__label">Game date</span>
      <span class="fm-kpi__value">19 May 2027</span>
      <span class="fm-kpi__sub">Loaded 2 min ago</span>
    </div>
  </div>
  …
</div>

<span class="fm-grade" data-variant="positive" title="Recommended">A</span>
```

| Class | Notes |
|---|---|
| `.fm-section-title` | Orange, Roboto Condensed bold, uppercase, 14px. Use an `<h2>`/`<h3>` and write the text in normal case (CSS uppercases it). `--sm` is 12px. |
| `.fm-section-bar`, `__actions` | Strip on `--surface-2` with the title left and controls right. `--plain` drops the strip. |
| `.value-pill` | Grey rounded value (sale value range, wage, "Free"). `__knob` is FM's small decorative circle. Modifiers: `--outline`, `--muted`, `--wide` (136px, so pills align in a column), `--sm`. |
| `.fm-kpis`, `.fm-kpi`, `__text`, `__label`, `__value`, `__sub`, `__action` | Summary strip of label / big value / sub-line cells with dividers. Auto-fits columns of at least `--fm-kpi-min-w` (200px). |
| `.fm-icon-badge` | Round orange icon holder with a dark icon. Modifiers: `--sm`, `--violet`. Decorative: `aria-hidden`. |
| `.fm-grade` | Ringed letter (e.g. "A"). `data-variant` is `positive` (default), `warning`, `negative` or `neutral`. Give it a `title` or hidden text that explains the letter. |
| `.eyebrow` | Small grey condensed capitals label ("INTERESTED IN:"). |

---

## 6. Filters and form controls

### `.filter-panel`

Elements: `__header`, `__title`, `__chips` (active filters), `__body` (scrolls), `__footer`.

```html
<div class="filter-panel">
  <div class="filter-panel__header">
    <h2 class="filter-panel__title" tabindex="-1">Filters</h2>
    <button class="btn btn--ghost btn--sm" type="button">Reset</button>
    <button class="btn btn--ghost btn--sm btn--icon show-below-1100" type="button" aria-label="Close filters">
      <span class="btn__glyph" aria-hidden="true">×</span>
    </button>
  </div>
  <ul class="filter-panel__chips" aria-label="Active filters">
    <li class="chip chip--accent"><span class="chip__label"><span class="chip__key">CA</span> ≥ 140</span>
      <button class="chip__remove" type="button" aria-label="Remove filter: CA at least 140"></button></li>
  </ul>
  <div class="filter-panel__body">
    <details class="filter-section" open>…</details>
  </div>
  <div class="filter-panel__footer">
    <button class="btn btn--secondary" type="button">Save as shortlist</button>
    <button class="btn btn--primary" type="submit">Search</button>
  </div>
</div>
```

A suggested section order for players: Name & club · Ability (CA, PA, growth) · Age & physical ·
Positions & role · Nationality & league · Contract & value · Attributes (minimum per attribute) ·
Hidden · Personality · Traits.

### `.filter-section`: collapsible section

Use native `<details>`/`<summary>`. Keyboard and expanded state come for free. Sync with React
through `open` plus `onToggle`. The chevron rotates on its own.

```html
<details class="filter-section" open>
  <summary class="filter-section__header">
    <span class="filter-section__title">Ability</span>
    <span class="filter-section__count">2<span class="visually-hidden"> active filters</span></span>
  </summary>
  <div class="filter-section__body">…fields…</div>
</details>
```

The alternative markup works too: `<button class="filter-section__header" aria-expanded="true" aria-controls="…">` with
the body hidden through the `hidden` attribute.

### `.field`: label + control

| Class | Notes |
|---|---|
| `.field` | Column: label, control, hint, error. |
| `.field__label`, `.field__aside` | `__aside` is right-aligned in the label row (unit, range, "contains"). |
| `.field__hint`, `.field__error` | Link both through `aria-describedby`. When an error shows, set `aria-invalid="true"` on the control. |
| `.field--inline` | Label left, control right. `--field-control-w` sets the control width (default 120px). |
| `.field-row` | Fields side by side. `--field-cols` sets the column count (default 2). |

```html
<div class="field">
  <label class="field__label" for="f-club">Club <span class="field__aside">contains</span></label>
  <input class="input" id="f-club" type="text" aria-describedby="f-club-hint">
  <p class="field__hint" id="f-club-hint">Accent and case insensitive</p>
</div>

<!-- minimum attribute row -->
<div class="field field--inline" style="--field-control-w:56px">
  <label class="field__label" for="min-fin">Finishing</label>
  <input class="input input--sm input--num" id="min-fin" type="number" min="1" max="20" placeholder="–">
</div>
```

### `.input`, `.select`, `.search-box`

* `.input` covers text, number, date, search and `<textarea>`.
* Modifiers: `.input--sm`, `.input--num` (right-aligned, tabular, no spinner; arrow keys still work).
* `.select` is a native `<select>` with a theme-aware caret. `.select--sm` is the small size.
* `.search-box` wraps an `.input` and draws a magnifier.

```html
<div class="search-box"><input class="input" type="search" placeholder="Search players" aria-label="Search players"></div>
<select class="select select--sm" aria-label="Rows per page"><option>100</option></select>
```

### `.range`: min–max pair

```html
<div class="field" role="group" aria-labelledby="f-ca">
  <span class="field__label" id="f-ca">CA <span class="field__aside">1–200</span></span>
  <div class="range">
    <input class="input input--sm" type="number" inputmode="numeric" min="1" max="200" placeholder="min" aria-label="CA minimum">
    <span class="range__sep" aria-hidden="true">–</span>
    <input class="input input--sm" type="number" inputmode="numeric" min="1" max="200" placeholder="max" aria-label="CA maximum">
    <span class="range__unit">yrs</span> <!-- optional -->
  </div>
</div>
```

### `.checkbox`, `.radio`

Wrap a native input in a label. The input is restyled; its semantics stay native. FM look: a dark
square that becomes an orange fill with a near-black tick when checked.

* Modifiers: `.checkbox--block` (full width), `.checkbox--sm`.
* Elements: `.checkbox__text` (truncates), `.checkbox__count` (right-aligned count).
* `indeterminate` is styled: set it through a ref when part of a group is checked.

```html
<label class="checkbox checkbox--block">
  <input type="checkbox"> <span class="checkbox__text">Premier League</span> <span class="checkbox__count">612</span>
</label>
<label class="radio"><input type="radio" name="foot" value="left"> Left</label>
```

### `.combobox` + `.listbox`: nations, leagues, traits, roles

Follow the APG "combobox with listbox popup" pattern. DOM focus stays on the input; the highlighted
option is `aria-activedescendant` plus `data-active="true"` (accent wash and left bar). Selected options
get `aria-selected="true"` (check mark and bold). Show the chosen values as removable `.chip`s below
the input. Keys: ↑/↓ move, Enter toggles, Esc closes, typing filters.

```html
<div class="combobox">
  <input class="input input--sm" role="combobox" aria-expanded="true" aria-controls="lb-nations"
         aria-autocomplete="list" aria-activedescendant="opt-fra" aria-label="Nationality">
  <ul class="listbox" id="lb-nations" role="listbox" aria-multiselectable="true" aria-label="Nations">
    <li class="listbox__option" id="opt-fra" role="option" aria-selected="true" data-active="true">
      France <span class="listbox__meta">1,204</span></li>
    <li class="listbox__empty">No matches</li>
  </ul>
</div>
```

### `.btn`

| Modifier | Use |
|---|---|
| *(default)* / `.btn--secondary` | FM outlined grey button: Clear, Quick Search ▾, Cancel |
| `.btn--primary` | FM orange with near-black text. One per area: New Search, Search, Save. (The header's big violet button is `.fm-cta`, section 5.1.) |
| `.btn--ghost` | Toolbar and icon actions, Reset, Close |
| `.btn--danger` | Delete shortlist or snapshot (confirm in a `.modal`) |
| `.btn--sm` (24px) / `.btn--md` (28px, default) | Sizes |
| `.btn--icon` | Square, icon only. **Needs `aria-label`.** |
| `.btn--block` | Full width |

* Elements: `.btn__icon` (SVG), `.btn__glyph` (text glyph such as `×`), `.btn__label--collapsible`.
* States:
  * `disabled`, or `aria-disabled="true"` to keep the button focusable.
  * `aria-busy="true"` hides the label, shows a spinner and blocks clicks. Keep the width stable.
  * `aria-pressed="true"` marks a toggle as on.
* Always set `type="button"` unless the button submits a form.

```html
<button class="btn btn--primary" type="button" aria-busy="true">Load from FM</button>
<button class="btn btn--ghost btn--sm btn--icon" type="button" aria-label="Close"><span class="btn__glyph" aria-hidden="true">×</span></button>
```

`.link-btn` is a `<button>` styled as a link. Use it for player names in tables and for inline
actions. `.link-btn--muted` is the quieter version.

### `.btn-group`: joined buttons and segmented control

* For independent toggles, give each button `aria-pressed`.
* For a single choice, use `role="radiogroup"` with `role="radio"` and `aria-checked` on the buttons.
  Use roving tabindex: arrow keys move and select.
* `.btn-group--block` stretches the buttons to equal widths.

```html
<div class="btn-group" role="radiogroup" aria-label="Row density">
  <button class="btn btn--sm" type="button" role="radio" aria-checked="true" tabindex="0">Compact</button>
  <button class="btn btn--sm" type="button" role="radio" aria-checked="false" tabindex="-1">Normal</button>
</div>
```

---

## 7. Chips, badges, status

### `.chip`

Use for active filters (removable) and for static tags such as traits.

* Elements: `.chip__label`, `.chip__key` (muted prefix), `.chip__remove` (a button with an `aria-label`;
  the `×` is drawn by CSS).
* Modifiers: `.chip--accent` (active filter), `.chip--sm`.
* When a chip is removed, move focus to the next chip, or to the panel title if none is left.

### `.badge`

FM-style small solid labels in condensed bold, mixed case: `Inj` (`--negative`, red),
`Wnt`/`Ask` (`--positive`, green), `Loan`, `Free`, `Listed`, `Player-coach`, `Rel. clause`.

* Solid colour variants: `--accent` (orange), `--positive`, `--negative`, `--warning`, `--info`.
  `--outline` is unfilled. The default is a neutral grey pill.
* `.badge--count` is a round number badge.
* `.badge--unverified` shows dashed `? unverified` text and is not uppercase. Use it for the
  `STAFF_UNVERIFIED` attributes. Put one badge in the group title or legend, and mark each affected
  tile with `class="attr is-unverified" title="Memory offset not yet verified"`.

```html
<span class="badge badge--warning">Listed</span>
<span class="badge badge--unverified">unverified</span>
```

### `.pill-status`: connection state

| `data-state` | When (from `/api/status`) | Dot shape | Example label |
|---|---|---|---|
| `connected` | `state==='ready' && source==='live'` | filled circle | `Live` + detail `FM 2024` |
| `loading` | `state==='loading'` | spinning ring | `Loading` + detail `players 42%` |
| `offline` | `state==='idle'` (not attached to FM) | hollow circle | `Not connected` |
| `error` | `state==='error'`, or the server is unreachable | diamond | `Error` + `message` |
| `snapshot` | `state==='ready' && source==='snapshot'` | square | `Snapshot` + detail `snapshotName` |

```html
<span class="pill-status" data-state="snapshot" role="status">
  <span class="pill-status__dot" aria-hidden="true"></span>
  <span class="pill-status__label">Snapshot</span>
  <span class="pill-status__detail">2024-08-14 Arsenal</span>
</span>
```

`role="status"` makes screen readers announce state changes. If clicking should do something
(reconnect, open snapshots), put a separate button next to the pill.

### `.callout`: inline notice

Use it for "FM is not running", "Staff values partly unverified" or a load error.

* Children must be exactly `.callout__content` (holding `.callout__title` and `.callout__body`) and
  an optional `.callout__actions`.
* `data-variant` is `info` (default), `success`, `warning` or `error`. Each variant has its own icon glyph.
* Use `role="alert"` only for errors that just appeared.

```html
<div class="callout" data-variant="warning">
  <div class="callout__content"><p class="callout__title">FM is not running</p>
    <p class="callout__body">Start Football Manager 2024 and load a save, or open a snapshot.</p></div>
  <div class="callout__actions"><button class="btn btn--sm" type="button">Open snapshot</button></div>
</div>
```

---

## 8. Data tables

### Structure

```html
<div class="table-scroll table-scroll--flush" role="region" aria-label="Player results" tabindex="0">
  <table class="data-table data-table--sticky-first data-table--interactive">
    <caption class="visually-hidden">Players, sorted by CA, descending</caption>
    <thead>
      <tr>
        <th scope="col" class="col-name"><button class="th-sort" type="button">Name</button></th>
        <th scope="col" class="num">Age</th>                       <!-- not sortable: plain text -->
        <th scope="col" class="num" aria-sort="descending"><button class="th-sort" type="button">CA</button></th>
        <th scope="col" class="num"><button class="th-sort" type="button">PA</button></th>
        <th scope="col" class="col-rating"><button class="th-sort" type="button">Role %</button></th>
        <th scope="col" class="col-attr col-group-start">
          <button class="th-sort" type="button" aria-label="Corners" title="Corners">Cor</button></th>
        …
      </tr>
    </thead>
    <tbody>
      <tr class="is-selected">
        <td class="col-name">
          <div class="cell-name">
            <button class="shortlist-star shortlist-star--sm" type="button" aria-pressed="true" aria-label="Shortlist Bukayo Saka"></button>
            <button class="link-btn" type="button" aria-haspopup="dialog">Bukayo Saka</button>
            <span class="badge badge--info">Loan</span>
          </div>
        </td>
        <td class="num">22</td>
        <td class="num"><span class="ability" data-tier="4">158</span></td>
        <td class="num"><span class="ability" data-tier="5">172</span></td>
        <td class="col-rating"><span class="rating" data-tier="4">84</span></td>
        <td class="col-attr col-group-start"><span class="attr" data-tier="3">13</span></td>
      </tr>
    </tbody>
  </table>
</div>
```

| Class | Notes |
|---|---|
| `.table-scroll` | Scroll container (both axes), framed. `--flush` drops the frame (full-bleed results). `--auto` sizes to content inside a card or page, up to `--table-max-h` (480px). Needs `role="region"`, `aria-label` and `tabindex="0"` so keyboard users can scroll. Set `aria-busy="true"` while loading. |
| `.data-table` | Dense table: 26px rows, 12.5px tabular figures, sticky header in grey condensed capitals, alternating row shades, lighter hover, violet-tinted selected row. No grid lines. |
| `.data-table--sticky-first` | First column sticky (header corner too). Put the shortlist star **inside** the name cell so one sticky column is enough. |
| `.sticky-col` | Extra sticky columns: add the class to every cell of that column and set `style="--sticky-left:<px>"`. |
| `.data-table--interactive` | Pointer cursor on rows (rows open the profile). |
| `.data-table--compact` / `--comfy` | Compact: 22px rows. Comfy: the **FM "comfortable" look**, 52px rows, 13px text, built for two-line `.cell-stack` cells (name / nationality, club / league, position / role). The default 26px dense rows remain the Genie Scout mode. |
| `.cell-stack`, `__main`, `__sub` | Two-line cell: a bold white primary line (or a `.link-btn` as the first child) over a grey secondary line. In dense tables the secondary line moves inline after the primary one. Width is capped by `--cell-max-w` (260px). |
| `.data-table--no-zebra` | No row striping. |
| `.data-table--grouped` | Two header rows. The first row holds group labels (`<th colspan>` Technical / Mental / …); the second row holds the columns and sticks below it. |
| `tr.is-selected` | The row whose profile is open, or rows checked for compare. Shows a 3px accent bar plus a tint. **Visual only**: multi-select uses a real checkbox in a `.col-icon` cell. |
| `.th-sort` | Button filling a sortable header. Shows an arrow and an accent underline when its `th` has `aria-sort`. |
| `.num` | Right-aligned tabular cell. The sort arrow sits left of the label. |
| `.col-name` | min 180px. Wrap the content in `.cell-name` (truncates at `--cell-name-max-w`, 260px). |
| `.col-attr` | 30px centred column for one `.attr`. The sort arrow sits under the label. |
| `.col-rating` | Centred column for `.rating`. |
| `.col-ability` | min 128px. Combined CA/PA cell: number, `.ability-bar--sm`, number. |
| `.col-icon` | 32px column (checkbox, star, menu). |
| `.col-group-start` | Strong left divider at the start of each attribute group. |
| `.col-wrap` | Allows wrapping (rare). |
| `.cell-truncate` | Ellipsis at `--cell-max-w` (200px) for club, league or nation text. |
| `.cell-sub`, `.cell-muted` | Secondary text inside a cell. |

FM "comfortable" row (two-line cells, value pills):

```html
<table class="data-table data-table--comfy data-table--sticky-first data-table--interactive">
  …
  <tr>
    <td class="col-name"><div class="cell-name">
      <button class="shortlist-star shortlist-star--sm" type="button" aria-pressed="false" aria-label="Shortlist Mario Pašalić"></button>
      <div class="cell-stack">
        <button class="link-btn" type="button" aria-haspopup="dialog">Mario Pašalić</button>
        <span class="cell-stack__sub">Croatian</span>
      </div></div></td>
    <td><div class="cell-stack"><span class="cell-stack__main">AS Roma</span><span class="cell-stack__sub">Italian Serie A</span></div></td>
    <td><div class="cell-stack"><span class="cell-stack__main">M (C), AM (RC), ST (C)</span><span class="cell-stack__sub">Advanced Forward</span></div></td>
    <td class="num">32</td>
    <td class="num"><span class="value-pill value-pill--wide">€400K - €3.9M</span></td>
    <td class="num">€77,000 p/w</td>
    <td class="col-icon"><span class="badge badge--negative">Inj</span></td>
  </tr>
</table>
```

### Sorting rules (keyboard and ARIA)

* The `<th>` keeps the column header role. The **`<button class="th-sort">` inside it** is the
  control, so Enter and Space work natively.
* Only the currently sorted column's `th` carries `aria-sort="ascending"` or `aria-sort="descending"`.
  Every other header has **no** `aria-sort`.
* First click: descending for numeric columns, ascending for text. A second click flips the direction.
* Sort keys come from `shared/api.ts` (`attr:<key>`, `posr:<pos>`, `role:<id>` …).
* Attribute headers show `ATTR_SHORT`. Put `ATTR_LABELS` in both `aria-label` and `title`.
* Keep the `<caption>` (visually hidden) in sync: "Players, sorted by Finishing, descending".

### Rows and activation

* Keyboard path: the name `.link-btn` opens the profile drawer. Mouse convenience: a row `onClick`
  (with `.data-table--interactive`). The row handler must ignore clicks that started on buttons,
  inputs or links.
* While the drawer is open, the matching row gets `.is-selected`. Prev/next in the drawer moves it and
  calls `scrollIntoView({ block: 'nearest' })` on the row.
* Missing value: `<span class="attr">–</span>` (no `data-tier`).
* Loading: keep the old rows, un-hide `.loading-overlay`, and set `aria-busy="true"` on `.table-scroll`.
* Empty: replace the table with an `.empty-state` inside `.results__body`.
* Page size: the server allows up to 1000 rows. Default to 100. Above about 300 rows × 60 columns,
  virtualise the `<tbody>` with spacer rows; keep the real `<table>`.

### `.toolbar`

Elements: `__count`, `__group`, `__spacer`, `__divider`. The `--footer` modifier (border on top)
holds the pagination.

The toolbar sits directly on the page, with no strip. `__count` renders as an orange condensed
uppercase title ("1,284 PLAYERS"); write it in normal case.

```html
<div class="toolbar">
  <button class="btn btn--secondary btn--sm" type="button" aria-expanded="false" aria-controls="player-filters">Filters</button>
  <span class="toolbar__count" aria-live="polite"><strong>1,284</strong> players</span>
  <span class="toolbar__spacer"></span>
  <div class="toolbar__group">…density .btn-group…</div>
  <span class="toolbar__divider" aria-hidden="true"></span>
  <div class="popover-anchor">…column chooser…</div>
  <div class="popover-anchor">…export menu (CSV / HTML)…</div>
</div>
```

### `.pagination`

Elements: `__info`, `__pages`, `__page` (`aria-current="page"` on the current one), `__ellipsis`,
`__size` (rows-per-page select).

```html
<nav class="pagination" aria-label="Pagination">
  <span class="pagination__info">1–100 of 1,284</span>
  <button class="btn btn--ghost btn--sm btn--icon" type="button" aria-label="Previous page" disabled>‹</button>
  <ul class="pagination__pages">
    <li><button class="pagination__page" type="button" aria-current="page">1</button></li>
    <li><button class="pagination__page" type="button">2</button></li>
    <li><span class="pagination__ellipsis" aria-hidden="true">…</span></li>
    <li><button class="pagination__page" type="button" aria-label="Page 13">13</button></li>
  </ul>
  <button class="btn btn--ghost btn--sm btn--icon" type="button" aria-label="Next page">›</button>
  <label class="pagination__size">Rows <select class="select select--sm"><option>100</option></select></label>
</nav>
```

### `.popover`, `.menu`, `.column-chooser`

* `.popover-anchor` is the positioned wrapper (trigger + popover).
* `.popover` drops below the trigger. `--end` aligns it to the right edge; `--up` opens it upwards.
* `.menu` is a list of `.menu__item`s, plus `.menu__label`, `.menu__sep` and `.menu__item--danger`.
  `aria-checked="true"` on an item shows a check mark.
* `.column-chooser` is a popover dialog with `__header` (search), `__body`, `__group` (fieldset),
  `__legend`, `__list` (two columns of `.checkbox`) and `__footer`.

```html
<div class="popover-anchor">
  <button class="btn btn--secondary btn--sm" type="button" aria-haspopup="dialog" aria-expanded="true" aria-controls="cols">Columns</button>
  <div class="popover popover--end column-chooser" id="cols" role="dialog" aria-label="Choose columns">
    <div class="column-chooser__header"><div class="search-box"><input class="input input--sm" type="search" aria-label="Find column"></div></div>
    <div class="column-chooser__body">
      <fieldset class="column-chooser__group">
        <legend class="column-chooser__legend">Technical <button class="link-btn link-btn--muted" type="button">All</button></legend>
        <div class="column-chooser__list">
          <label class="checkbox"><input type="checkbox" checked> <span class="checkbox__text">Finishing</span></label>
        </div>
      </fieldset>
    </div>
    <div class="column-chooser__footer">
      <button class="btn btn--ghost btn--sm" type="button">Reset to default</button>
      <button class="btn btn--primary btn--sm" type="button">Done</button>
    </div>
  </div>
</div>

<div class="popover-anchor">
  <button class="btn btn--secondary btn--sm" type="button" aria-haspopup="menu" aria-expanded="true" aria-controls="exp">Export</button>
  <div class="popover popover--end" id="exp">
    <ul class="menu" role="menu" aria-label="Export">
      <li role="none"><button class="menu__item" role="menuitem" type="button">CSV</button></li>
      <li role="none"><button class="menu__item" role="menuitem" type="button">HTML table</button></li>
    </ul>
  </div>
</div>
```

Popover behaviour:
* Opening moves focus into the popover (the search field, or the first item).
* Esc or an outside click closes it, and focus returns to the trigger.
* Menus support ↑/↓, Home and End.
* The column chooser applies changes live. Persist the chosen columns per view (players, staff,
  clubs) in localStorage.

---

## 9. Values and visualisations

### `.attr` (1-20), `.rating` (0-100), `.ability` (CA/PA)

FM style: these render as **coloured numbers** on the row background. Colour, weight and the
tier-5 capsule come from `data-tier` (section 4). Without a tier the number is neutral grey.

| Class | Notes |
|---|---|
| `.attr` | 22px box (`--attr-size`) with a centred 13px number. `.attr--sm` 18px, `.attr--lg` 26px. |
| `.rating` | Number box, min 30px. `.rating__unit` is a smaller `%`. In tables, leave out the unit and say "%" in the header. |
| `.ability` | Number box, min 32px, for 3-digit CA/PA. |
| `.attr--tile`, `.rating--tile`, `.ability--tile` | Subtle opaque tile behind the number (the pre-FM tile look, toned down). Use it where values float outside rows, e.g. compare cells or cards. |
| `.is-unverified` | Dashed warning outline (staff offsets in `STAFF_UNVERIFIED`). Add a `title`. |

```html
<span class="attr" data-tier="5">19</span>
<span class="attr" data-tier="1" title="Lower is better">17</span> <!-- injuryProneness 17 -->
<span class="rating" data-tier="4">82<span class="rating__unit">%</span></span>
<span class="ability" data-tier="5">171</span>
<span class="attr">–</span>
<span class="attr attr--tile" data-tier="4">16</span>
```

### `.ability-bar`: CA vs PA overlay

Set `style="--ca:142; --pa:171"` (1-200), `data-ca-tier` and `data-pa-tier` (`abilityTier`). PA is a
hatched band with an end tick; CA is a solid fill on top. The pattern tells them apart, not the colour.

* Sizes: 8px default, `--sm` 4px (table cells), `--lg` 12px.
* Give it `role="img"` and an `aria-label` ("Current ability 142, potential 171 of 200"), or
  `aria-hidden="true"` when the numbers are printed next to it.
* `.ability-meter` is the labelled version for the profile header and compare heads. Elements:
  `__labels`, `__value`.

```html
<div class="ability-meter">
  <div class="ability-meter__labels">
    <span>CA<span class="ability-meter__value">142</span></span>
    <span>PA<span class="ability-meter__value">171</span></span>
  </div>
  <div class="ability-bar" style="--ca:142; --pa:171" data-ca-tier="4" data-pa-tier="5" aria-hidden="true"></div>
</div>

<!-- compact table cell -->
<td class="col-ability"><div class="flex items-center gap-1-5">
  <span class="tabular">142</span>
  <span class="ability-bar ability-bar--sm flex-1" style="--ca:142; --pa:171" data-ca-tier="4" data-pa-tier="5" aria-hidden="true"></span>
  <span class="tabular muted">171</span></div></td>
```

### `.meter`, `.meter-row`, `.meter-list`: 0-100 bars with labels

Use these for role ratings, position ratings and staff role suitability. Set `--value` (0-100) on the
`.meter` itself. Put the tier on the row so the meter and the rating share it. `.is-best` makes the
label bold. `--meter-w` sets the bar column width (default 140px).

```html
<ul class="meter-list" aria-label="Role ratings">
  <li class="meter-row is-best" data-tier="5">
    <span class="meter-row__label">Advanced Forward <span class="meter-row__sub">Attack</span></span>
    <span class="meter" style="--value:91" aria-hidden="true"></span>
    <span class="rating">91</span>
  </li>
</ul>
```

### `.stars`: 0-5 in half steps

Use them for staff `coachingStars`. The fill comes from `--value`. Sizes: `--sm` 12px, default 14px,
`--lg` 18px.

```html
<span class="stars" style="--value:3.5" role="img" aria-label="3.5 of 5 stars"></span>
```

### `.shortlist-star`: toggle

A `<button>` with `aria-pressed`. Off shows an outline star; on shows a filled gold star.
`--sm` is 20px; the default is 24px.

* Keep the `aria-label` constant, e.g. "Shortlist Bukayo Saka". `aria-pressed` carries the on/off state.
* The star toggles membership of the **active** shortlist. Use a `.menu` for adding to other lists.

### `.pitch`: position familiarity map

* Size with `--pitch-w` (default 240px). `--sm` is 160px, `--lg` 320px. The 68:105 ratio is fixed.
* Each dot is placed with `style="--x:<x>; --y:<y>"` from `POSITION_PITCH`. The own goal is drawn at
  the bottom.
* `data-fam` comes from `familiarity()`. Each value has its own fill, outline and size:

| `data-fam` | FM familiarity | Look |
|---|---|---|
| `natural` | ≥ 18 | large, filled bright green, bold |
| `accomplished` | 15-17 | filled yellow-green |
| `competent` | 12-14 | filled amber |
| `unconvincing` | 9-11 | hollow, solid orange ring |
| `awkward` | 5-8 | small, hollow, dashed red ring |
| `ineffectual` | < 5 | 8px dot, no label, `aria-hidden="true"`. Usually leave it out. |

* Render the dots in DOM order **best first**, so screen readers hear the best positions first.
* The visible label (e.g. `AMC`) is `aria-hidden`; a visually hidden span holds the full text.
* Dots may be `<button class="pitch__dot">` (e.g. to filter by position).
* `.pitch-legend` is a legend strip on grass; inside it use `.pitch__dot.pitch__dot--static`.

```html
<figure class="pitch-figure">
  <div class="pitch">
    <ul class="pitch__dots" aria-label="Positions">
      <li class="pitch__dot" data-fam="natural" style="--x:50; --y:88" title="Striker: Natural (20)">
        <span aria-hidden="true">ST</span><span class="visually-hidden">Striker: Natural</span></li>
      <li class="pitch__dot" data-fam="unconvincing" style="--x:14; --y:72" title="Attacking Midfielder (Left): Unconvincing (10)">
        <span aria-hidden="true">AML</span><span class="visually-hidden">Attacking Midfielder (Left): Unconvincing</span></li>
    </ul>
  </div>
  <ul class="pitch-legend">
    <li class="pitch-legend__item"><span class="pitch__dot pitch__dot--static" data-fam="natural" aria-hidden="true">N</span> Natural</li>
    …
  </ul>
</figure>
```

---

## 10. Profile (drawer content)

### `.drawer`

* Use a native `<dialog>` opened with `showModal()`. The background becomes inert, focus stays inside,
  and Esc fires `cancel`.
* Width is 720px (`--drawer-w`); `.drawer--wide` is 960px. Below 900px it is full width.
* Elements: `__header` (small bar: eyebrow, prev/next, star, close), `__title`, `__body` (scrolls),
  `__footer`. `.profile-header` and `.tabs` sit between the header and the body, so they stay fixed
  while the body scrolls.
* Non-dialog fallback: a `<div class="drawer" role="dialog" aria-modal="true">` next to a
  `.drawer-backdrop`. In that case you must provide the focus trap yourself.

```html
<dialog class="drawer" aria-labelledby="pp-name">
  <div class="drawer__header">
    <span class="eyebrow">Player</span>
    <span class="spacer"></span>
    <button class="btn btn--ghost btn--sm btn--icon" type="button" aria-label="Previous player">‹</button>
    <button class="btn btn--ghost btn--sm btn--icon" type="button" aria-label="Next player">›</button>
    <button class="shortlist-star" type="button" aria-pressed="false" aria-label="Shortlist Bukayo Saka"></button>
    <button class="btn btn--ghost btn--sm btn--icon" type="button" aria-label="Close profile" autofocus>
      <span class="btn__glyph" aria-hidden="true">×</span></button>
  </div>
  <header class="profile-header">…</header>
  <div class="tabs" role="tablist" aria-label="Profile sections">…</div>
  <div class="drawer__body">
    <div class="tab-panel" role="tabpanel" id="tp-attrs" aria-labelledby="tab-attrs" tabindex="0">…</div>
  </div>
</dialog>
```

Behaviour (required):
* Open with `showModal()` and focus the close button (`autofocus`).
* **Esc** closes it. Sync React state from the dialog's `close` event.
* A click on the backdrop closes it (`e.target === dialogElement`).
* On close, **return focus** to the name button that opened it.
* Prev/next steps through the current result page, updates `.is-selected` and scrolls that row into
  view. Optional shortcuts: `Alt+↑` and `Alt+↓`.
* If a toast must show above an open dialog, see `.toast-region`.

### `.profile-header`

* Elements: `__identity`, `__avatar` (monogram or best position, `aria-hidden`), `__titles`,
  `__name` (h2, the dialog's label), `__name-text` (truncates), `__meta` (a `<ul>` of facts with dot
  separators), `__tags` (badges), `__stats` (a `<dl>` of `.stat`s), `__actions`.
* `.stat` is a label plus a big number. Elements: `__label` (dt), `__value` (dd), `__sub`.
  `.stat--lg` makes the value larger.

```html
<header class="profile-header">
  <div class="profile-header__identity">
    <div class="profile-header__avatar" aria-hidden="true">AMR</div>
    <div class="profile-header__titles">
      <h2 class="profile-header__name" id="pp-name"><span class="profile-header__name-text">Bukayo Saka</span></h2>
      <ul class="profile-header__meta"><li>22 yrs</li><li>England</li><li>Arsenal</li><li>AM (RL), M (R)</li><li>Left foot 11 / Right 20</li></ul>
      <div class="profile-header__tags"><span class="badge">Player-coach</span></div>
    </div>
  </div>
  <dl class="profile-header__stats">
    <div class="stat"><dt class="stat__label">Ability</dt><dd class="stat__value"><div class="ability-meter">…</div></dd></div>
    <div class="stat"><dt class="stat__label">Value</dt><dd class="stat__value">€120M</dd></div>
    <div class="stat"><dt class="stat__label">Best role</dt><dd class="stat__value"><span class="rating" data-tier="4">87</span></dd>
      <dd class="stat__sub">Inside Forward (A) · AMR</dd></div>
  </dl>
</header>
```

### `.tabs` + `.tab-panel`: ARIA tabs (in-page)

Suggested player tabs: Overview · Attributes · Positions & roles · Personality · Contract · Report.

* Use `role="tablist"` (with `aria-label`), `role="tab"`, and `aria-selected` plus `aria-controls`
  on every tab.
* Use roving tabindex: the selected tab has `tabindex="0"`, the others `-1`.
* Keys: **←/→** move between tabs and activate them immediately; **Home/End** jump to the first or
  last tab.
* Panels: `role="tabpanel"`, `aria-labelledby`, and `tabindex="0"` when the panel starts with
  non-focusable content. Hide inactive panels with the `hidden` attribute.
* Modifiers: `.tabs--sm` (28px) and `.tab-panel--flush` (no padding).

```html
<div class="tabs" role="tablist" aria-label="Profile sections">
  <button class="tabs__tab" role="tab" id="tab-attrs" aria-selected="true" aria-controls="tp-attrs" tabindex="0" type="button">Attributes</button>
  <button class="tabs__tab" role="tab" id="tab-roles" aria-selected="false" aria-controls="tp-roles" tabindex="-1" type="button">Positions &amp; roles</button>
</div>
```

### `.card`, `.card-grid`

* Elements: `__header`, `__title` (small uppercase), `__actions`, `__body`, `__footer`.
* Modifiers: `--flush` (body without padding; use it for a table inside the card) and `--raised`.
* `.card-grid` auto-fills columns at least `--card-min-w` (280px) wide.

### `.kv`: key/value list

Use a `<dl>` with `.kv__row` wrappers (subgrid keeps the keys aligned).

* `.kv--cols-2` shows two pairs per line (one below 768px).
* `--num` right-aligns tabular values. `--compact` is tighter. `--divided` adds a rule under each row.

```html
<dl class="kv kv--cols-2 kv--divided">
  <div class="kv__row"><dt>Wage</dt><dd>€195K p/w</dd></div>
  <div class="kv__row"><dt>Expires</dt><dd>30 Jun 2027</dd></div>
  <div class="kv__row"><dt>Release clause</dt><dd>€150M <span class="badge badge--outline">Foreign</span></dd></div>
</dl>
```

### `.attr-grid`: attribute columns

* Players: Technical · Mental · Physical.
* Goalkeepers: `.attr-grid--gk` with Goalkeeping · Technical (`.attr-group--secondary`) · Mental · Physical.
  Four columns fit in the 720px drawer.
* Hidden attributes and personality go in their own `.card`, using the same `.attr-list`.
* Staff: Coaching · Mental · Knowledge · Medical & Data · Hidden.

| Class | Notes |
|---|---|
| `.attr-group`, `.attr-group__title`, `.attr-group__avg` | `<section>` + `<h3>`. The average is optional. |
| `.attr-list`, `.attr-row` | `<ul>` / `<li>`, columns: label · projection · tile. |
| `.attr-row__label` | Full name from `ATTR_LABELS` (truncates; add `title`). |
| `.attr-row__proj` (+`--up`) | Projected value at PA from `PlayerDetail.projected`, e.g. `↑17`. When projections are on, render it in **every** row (empty if unchanged) so the tiles stay aligned. Omit it in all rows when they are off. |
| `data-emphasis="key" \| "preferred"` | Key / preferred attribute of the selected role (`shared/roles.ts`). Key = solid accent bar + bold; preferred = dotted bar + semibold. Show a one-line legend. |

```html
<div class="attr-grid">
  <section class="attr-group" aria-labelledby="g-tech">
    <h3 class="attr-group__title" id="g-tech">Technical <span class="attr-group__avg">avg 14.1</span></h3>
    <ul class="attr-list">
      <li class="attr-row" data-emphasis="key">
        <span class="attr-row__label">Dribbling</span>
        <span class="attr-row__proj attr-row__proj--up" title="Projected at PA">↑18</span>
        <span class="attr" data-tier="4">16</span>
      </li>
      <li class="attr-row">
        <span class="attr-row__label">Long Throws</span>
        <span class="attr-row__proj"></span>
        <span class="attr" data-tier="1">4</span>
      </li>
    </ul>
  </section>
  …
</div>
```

### `.prose`, `.kbd`, `.divider`

* `.prose` holds the scouting report paragraphs (max 70ch).
* `.kbd` shows a keyboard hint.
* `.divider` is a horizontal rule; `.divider--vertical` is the vertical version.

---

## 11. Compare (`.compare-grid`)

A real `<table>` with 2 to 4 people side by side. Set `data-cols="2" | "3" | "4"`.

* The header row and the label column are sticky. Wrap the table in `.table-scroll` for horizontal
  scrolling at narrow widths.
* Rows are attributes or facts. `.compare-grid__section` rows hold group titles: a `<th colspan>`
  containing a `<span>`.
* **Best value per row**: put `.is-best` on the winning `td`. It gets a positive tint, a ring, bold
  text and a ▲ marker. Also add `<span class="visually-hidden">(best)</span>` inside it.
  * Ties: mark every tied cell. If all values are equal, mark none.
  * "Best" means the highest value, except for `INVERTED_KEYS` and wage, where the lowest wins.
  * Text facts (club, nation) get no marker.
* `.is-worst` mutes a value (optional).
* Head elements: `.compare-grid__head`, `__name`, `__sub`, `__remove` (an icon button in the header
  corner) and `__add` (an empty dashed slot that opens a player picker).

```html
<div class="table-scroll table-scroll--auto" role="region" aria-label="Comparison" tabindex="0">
  <table class="compare-grid" data-cols="3">
    <thead><tr>
      <th scope="col"><span class="visually-hidden">Attribute</span></th>
      <th scope="col"><div class="compare-grid__head">
        <span class="compare-grid__name">Bukayo Saka</span><span class="compare-grid__sub">Arsenal · 22</span>
        <div class="ability-meter">…</div></div>
        <button class="btn btn--ghost btn--sm btn--icon compare-grid__remove" type="button" aria-label="Remove Bukayo Saka from comparison"><span class="btn__glyph" aria-hidden="true">×</span></button></th>
      …
    </tr></thead>
    <tbody>
      <tr class="compare-grid__section"><th colspan="4" scope="colgroup"><span>Technical</span></th></tr>
      <tr><th scope="row">Dribbling</th>
        <td class="is-best"><span class="attr" data-tier="4">16</span><span class="visually-hidden">(best)</span></td>
        <td><span class="attr" data-tier="3">14</span></td>
        <td><span class="attr" data-tier="3">12</span></td></tr>
    </tbody>
  </table>
</div>
```

---

## 12. Overlays and feedback

### `.modal`

* Use a native `<dialog class="modal">` with `showModal()`.
* Sizes: `--sm` 400px, default 560px, `--lg` 820px.
* Elements: `__header`, `__title`, `__body` (scrolls), `__footer` (primary button last).
* The behaviour matches the drawer: focus the first field or the safest button, close on Esc, return
  focus on close. A destructive confirm should focus **Cancel**.
* `.modal-backdrop` + `div.modal` is the non-dialog fallback.

### `.toast-region` + `.toast`

* Elements: `.toast__title`, `.toast__msg`, `.toast__actions`, `.toast__close` (an icon button).
* `data-variant` is `info` (default), `success`, `warning` or `error`. Each variant has its own icon
  glyph and a coloured left edge.

```html
<div class="toast-region" role="region" aria-label="Notifications" aria-live="polite">
  <div class="toast" data-variant="success">
    <p class="toast__title">Snapshot saved</p>
    <p class="toast__msg">2024-08-14 Arsenal · 38 MB</p>
    <button class="btn btn--ghost btn--sm btn--icon toast__close" type="button" aria-label="Dismiss"><span class="btn__glyph" aria-hidden="true">×</span></button>
  </div>
</div>
```

* Keep the region mounted at all times so live announcements work. Render error toasts with
  `role="alert"`.
* Auto-dismiss info and success after about 6 s, and pause on hover or focus. **Never** auto-dismiss errors.
* Above an open `<dialog>`: give the region `popover="manual"` and call `showPopover()` at startup.
  After opening any dialog, call `hidePopover()` and then `showPopover()` so the region sits on top of
  the top layer. CSS for the `[popover]` case is already included.

### `.empty-state`

* Elements: `__icon` (an SVG or glyph, `aria-hidden`), `__title`, `__text`, `__actions`.
* `--compact` has less padding (use it inside cards).
* Always say why the view is empty and what to do: "No players match these filters" with a
  **Reset filters** button, or "Not connected to FM" with **Load from FM** / **Open snapshot**.

### `.spinner`

* Sizes: `--sm` 12px, default 16px, `--lg` 32px. It inherits `color` (accent by default).
* When the spinner is the only indication, add `role="status"` and visually hidden text ("Loading").

### `.progress`

A determinate bar for loading FM data, plus an indeterminate variant.

* Elements: `__label` (text + `__value`), `__track`, `__bar`.
* Set `style="--value:42"` (0-100) on `.progress` or on `__bar`.
* `--lg` is a thicker bar. `--indeterminate` is for unknown totals; under reduced motion it becomes
  a static striped bar.

```html
<div class="progress" role="progressbar" aria-label="Reading players" aria-valuemin="0" aria-valuemax="100"
     aria-valuenow="42" aria-valuetext="20,250 of 48,213 players" style="--value:42">
  <div class="progress__label"><span>Reading players</span><span class="progress__value">20,250 / 48,213</span></div>
  <div class="progress__track"><div class="progress__bar"></div></div>
</div>
```

### `.loading-overlay`

An absolute cover inside `.results__body` (or any positioned box). It dims the old content and holds
a spinner and a short text. Toggle it with `hidden`.

---

## 13. Utilities (base.css)

| Group | Classes |
|---|---|
| A11y | `.visually-hidden`, `.visually-hidden-focusable`, `.skip-link`, `.focus-inset` |
| Flex | `.flex`, `.inline-flex`, `.flex-col`, `.flex-wrap`, `.flex-1`, `.flex-none`, `.shrink-0`, `.min-w-0`, `.items-start/center/end/baseline/stretch`, `.justify-start/center/end/between`, `.self-start/center`, `.ml-auto`, `.mt-auto`, `.spacer` |
| Grid | `.grid`, `.grid-cols-2/3/4` |
| Groups | `.stack` (column, `--stack-gap`, default 8px), `.cluster` (wrapping row, `--cluster-gap`, default 6px) |
| Gap | `.gap-0`, `.gap-0-5`, `.gap-1`, `.gap-1-5`, `.gap-2`, `.gap-3`, `.gap-4`, `.gap-6`, `.gap-8` |
| Size | `.w-full`, `.h-full`, `.relative` |
| Text | `.text-left/center/right`, `.truncate`, `.nowrap`, `.num` (tabular + right + nowrap), `.tabular`, `.mono`, `.muted` (text-3), `.subtle` (text-2), `.strong`, `.small` (12px), `.xsmall` (11px), `.eyebrow` (grey condensed capitals), `.condensed` (Roboto Condensed 700), `.uppercase`, `.text-positive/negative/warning/info/accent` |
| Icons | `.icon`, `.icon--sm` |
| Responsive | `.hide-below-1100`, `.show-below-1100`, `.hide-below-900` |

---

## 14. Keyboard and ARIA checklist

* [ ] Everything is reachable with Tab, in visual order. Never remove the `:focus-visible` outline.
* [ ] Every icon-only button has an `aria-label`. Every input has a `<label>` or an `aria-label`.
* [ ] Targets are at least 24×24 px (`--hit-min`); all controls here already meet that.
* [ ] Sortable headers: a `button.th-sort` inside the `th`, and `aria-sort` on the sorted `th` only.
* [ ] `.table-scroll` has `role="region"`, `aria-label` and `tabindex="0"`. The table has a hidden
      `<caption>` describing the sort.
* [ ] Rows open from the name button (keyboard). A row click is only a mouse shortcut.
* [ ] Drawer and modals use `<dialog>` + `showModal()`: focus moves in, **Esc** closes, focus returns
      to the trigger, and the background is inert.
* [ ] Filter drawer below 1100px: `aria-expanded` and `aria-controls` on the toggle, focus moves in,
      **Esc** and the scrim close it, the results are `inert` while it is open, and focus returns on close.
* [ ] Main navigation uses links with `aria-current="page"`. In-page tabs use
      `role="tablist"`/`tab`/`tabpanel` with arrow keys, Home and End.
* [ ] Toggles use `aria-pressed` (shortlist star, view toggles). Single choice uses
      `role="radiogroup"`/`radio` with `aria-checked`.
* [ ] Comboboxes follow the APG pattern (`aria-activedescendant`, `aria-expanded`, `aria-controls`).
* [ ] Popovers and menus: `aria-haspopup` + `aria-expanded` on the trigger, Esc closes, focus returns.
* [ ] Status changes are announced: `.pill-status` has `role="status"`, the result count is
      `aria-live="polite"`, toasts sit in a live region, and errors use `role="alert"`.
* [ ] `.progress` has `role="progressbar"` with `aria-valuenow` and `aria-valuetext`.
* [ ] Graphics: `.stars` has `role="img"` + `aria-label`. `.ability-bar` and `.meter` have
      `role="img"` + label, or `aria-hidden` when the number is printed. Pitch dots carry visually hidden text.
* [ ] Colour is never the only signal: tiles print numbers, the selected row has a bar, the best
      compare value has ▲ plus hidden "(best)", status pills have text, unverified items have a dashed
      outline plus "?".
* [ ] The UI works at 200% zoom (layout reflows; tables scroll inside `.table-scroll`).
* [ ] Reduced motion is respected automatically. Don't add JS animations that ignore
      `prefers-reduced-motion`.

## 15. Do / don't

* **Do** keep numbers right-aligned and tabular (`.num`) everywhere, including inside `.kv--num`.
* **Do** show the full attribute name in `title` wherever only `ATTR_SHORT` is visible.
* **Do** keep the old rows on screen while a new search loads (overlay); no blank flashes.
* **Don't** hard-code colours, pixel sizes or z-indexes in components. Add a token or a class instead.
* **Don't** put `onClick` on non-interactive elements without a keyboard equivalent.
* **Don't** nest interactive elements (no buttons inside `.link-btn`, no links inside `.th-sort`).
* **Don't** load fonts or assets from the network, or add CSS frameworks. Fonts come only from the
  bundled `@fontsource` packages. The app must work offline.
* **Don't** hard-code FM colours (purple, orange, violet) in components. Use the `--fm-*`,
  `--accent*` and `--violet*` tokens.
