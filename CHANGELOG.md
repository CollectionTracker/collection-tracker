# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Demo data for `npm run dev`: a separate embedded database (`.data/pglite-demo`) is filled on first start with 42 cards across 11 sets, 13 sealed products, about 14 months of price history, snapshot labels and sync runs, so every view shows how it looks when full. Real data in `.data/pglite` is never touched; set `SEED_DEV_DATA=0` to use it instead, or delete `.data/pglite-demo` to regenerate the demo. Production builds and `DATABASE_URL` are unaffected.
- GitHub pull request template and issue forms (bug report, feature request, task) in `.github/`.
- Stitch design exports in `.renders/` as the reference for the dashboard redesign.
- Rarity value-mix donut chart on the dashboard.
- `sealed_products` and `sealed_price_snapshots` tables (name, product type, set/series group, SKU, quantity, per-unit purchase price, notes; daily market/low/mid/high prices) with a Drizzle migration; existing card tables are untouched.
- Sealed product CSV import (`POST /api/import/sealed`, `docs/sealed-sample.csv`): maps name, type, set, SKU, quantity and purchase price, merges duplicate rows, adds quantity to existing products, and reports invalid rows by row number.
- Manual sealed price entry: `setSealedPrice` and a `setSealedPriceAction` server action record a current value with optional low/high per product and day (re-entering a day edits it), validated so low ≤ value ≤ high. Snapshots gain a `price_source` column (`manual`) so an API source can be added later without another migration.
- Cost basis for sealed products: `getSealed` computes per-unit cost, total cost, gain/loss, average unit cost and cost basis, and `getDashboard` now returns `sealed` and a `combined` (raw + sealed) value, cost basis and gain/loss. Holdings without a purchase price are left out of cost basis and gain, as for raw cards.
- Low / mid / high valuation: `getDashboard` returns `{ low, mid, high }` for raw cards (`rawValuation`), sealed (`sealed.valuation`, plus one per sealed holding) and the combined portfolio. Sealed uses the low/high entered with a price, otherwise a default spread (raw ±10 %, sealed ±15 %) around the market value. Method documented in `docs/valuation.md`.
- Named snapshots: a `snapshot_labels` table (with migration) holds an optional label per snapshot day, `setSnapshotLabel` / `setSnapshotLabelAction` set or clear it (empty label clears; the day must have stored prices), `listSnapshots` returns every stored day with its label and row counts, and a Snapshots panel on the dashboard lists them with an inline label field.
- Snapshot picker and historical view: a dropdown in the dashboard header selects a stored snapshot (`/?snapshot=YYYY-MM-DD`, default current). `getDashboard(asOf)` and `getSealed(asOf)` use the latest prices on or before that day, so every figure, the value chart and the header subtitle reload as of that date; an unknown day falls back to current. Holdings (quantities, cost) are not versioned, so they always reflect today.
- YTD and 30-day comparison: `getComparisons` computes the change in combined raw + sealed portfolio value from stored snapshots, as of the selected snapshot. YTD compares against the last snapshot of the previous year (or the first of this year if history starts mid-year); the 30-day baseline must be a snapshot at least 30 days old. Two cards on the dashboard show the % and $ change, or an empty state when history is too short.
- Sync status: a `sync_runs` table (with migration) records every price sync (manual button and `/api/cron/sync`) with its result, card and price counts and any error. The dashboard header shows a status chip (synced, syncing, stale after 36 hours, sync failed, never synced), the last verified sync time, "updated N mins ago", and the error when the latest attempt failed.
- Four view routes (`/`, `/sealed`, `/raw`, `/scenarios`) sharing a root-layout header (PokeVault Analytics brand and links) and footer; the sealed, raw and scenarios routes are placeholders until their epics land.
- Top app bar view tabs: the header shows the PokeVault Analytics brand and a segmented pill control (Overview, Sealed Inventory, Raw Cards, Scenarios & Growth) that routes between the four views and highlights the current one.
- Mobile bottom tab bar: under 768px the header tabs are replaced by a fixed bottom bar (Overview, Sealed, Raw Cards, Scenarios) that highlights the current view; page content gets bottom padding so the bar never covers it.
- Responsive header drawer: below 1024px the header tabs and the dashboard toolbar collapse into a hamburger drawer with a "Views & Categories" section (the four views) and a "Portfolio Controls & Tools" section (currency pill, Import CSV, Sync prices).
- Footer status bar: brand and data source (Pokémon TCG API for cards, manual prices for sealed), the selected snapshot date (or the latest price date), the current view and a page indicator (e.g. 02 / 04).
- Responsive grid per the design system: shared `page-grid` (4 columns below 768px, 8 from 768px, 12 from 1024px; gutter 0.75rem on mobile, 1.25rem above) and `page-x` (page margins 1rem / 1.5rem / 2rem) utilities, applied to the header, footer, placeholder views and the dashboard sections (KPI cards `col-span-3`, rarity mix 5 and most valuable 7 columns on desktop).
- Agent guide in `AGENTS.md` and skills in `.agents/skills/` (`start-issue`, `commit`, `changelog`) defining the changelog, branch-naming and conventional-commit rules.
- Project README with a preview of the target design, and this changelog.

### Fixed
- Value-over-time chart logged duplicate React key errors when every snapshot had the same total (flat history gave repeated Y-axis ticks); the axis range is now computed from the data and padded by 2 % so ticks stay distinct.

### Changed
- Valuation context and assumptions card on the Overview: states that values are estimates, not realized proceeds, and that fees, taxes, shipping, condition, liquidity and preorder uncertainty are not accounted for.
- Collection structure panel on the Overview: sealed value split by product type (booster box, ETB, …) with percentage weights and amounts, the sealed low–high market range, and the share of sealed value held in the single largest holding; empty state until a sealed price is entered.
- Top sealed holdings panel on the Overview: the five most valuable sealed SKUs ranked as bars (top item highlighted, quantity shown) with the total SKU count, and an empty state until a sealed price is entered.
- Valuation & Concentration panel on the Overview: a low–mid–high range bar for the combined portfolio, the largest single holding (raw card or sealed stack) with its share of the portfolio, an amber concentration warning when it reaches 25 % (`CONCENTRATION_WARNING_PCT`), and a note that the range is not guaranteed realized sale proceeds.
- Portfolio value mix donut replaces the interim rarity donut: it splits combined value into Sealed and Raw cards, shows each share and amount in the legend, and highlights the matching slice (and the centre readout) when you hover a slice or legend row. The by-rarity bars below are unchanged.
- Overview summary cards: the four stat cards are now Total Portfolio (combined raw + sealed midpoint, YTD change and a sealed/raw split bar), Sealed Inventory, Raw Cards and Valuation Range (combined low – high with the midpoint). The old Total / Since last update / Gain-loss / Cards stats are folded in: total value is Total Portfolio, gain/loss and card counts move to the Sealed and Raw cards, and the day-over-day change is dropped in favour of YTD and the 30-day card.
- `start-issue` skill and `AGENTS.md` now define when to chain a branch off a blocking issue's branch and when to branch from `dev`, using GitHub "blocked by" links, which are now set on the sub-issues of every epic.
- `start-issue` skill now claims an issue first (checks board status and claim comments, sets it In Progress, releases it when done or abandoned) so only one agent works on an issue at a time.
- Restyled the dashboard to the "Executive Collectible Intelligence" design system: midnight/mint theme, Plus Jakarta Sans and Space Grotesk fonts, accent-bar summary cards and thicker progress bars.

## [0.1.0] - Initial release

### Added
- Next.js dashboard with total value, change since last update, gain/loss and card counts.
- CSV import of a card collection.
- Daily Pokémon TCG price sync with value-over-time history.
- Breakdowns by set, rarity and condition, plus top cards and top movers.
