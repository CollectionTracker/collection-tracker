# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Stitch design exports in `.renders/` as the reference for the dashboard redesign.
- Rarity value-mix donut chart on the dashboard.
- `sealed_products` and `sealed_price_snapshots` tables (name, product type, set/series group, SKU, quantity, per-unit purchase price, notes; daily market/low/mid/high prices) with a Drizzle migration; existing card tables are untouched.
- Agent guide in `AGENTS.md` and skills in `.agents/skills/` (`start-issue`, `commit`, `changelog`) defining the changelog, branch-naming and conventional-commit rules.
- Project README with a preview of the target design, and this changelog.

### Changed
- `start-issue` skill and `AGENTS.md` now define when to chain a branch off a blocking issue's branch and when to branch from `dev`, using GitHub "blocked by" links, which are now set on the sub-issues of every epic.
- `start-issue` skill now claims an issue first (checks board status and claim comments, sets it In Progress, releases it when done or abandoned) so only one agent works on an issue at a time.
- Restyled the dashboard to the "Executive Collectible Intelligence" design system: midnight/mint theme, Plus Jakarta Sans and Space Grotesk fonts, accent-bar summary cards and thicker progress bars.

## [0.1.0] - Initial release

### Added
- Next.js dashboard with total value, change since last update, gain/loss and card counts.
- CSV import of a card collection.
- Daily Pokémon TCG price sync with value-over-time history.
- Breakdowns by set, rarity and condition, plus top cards and top movers.
