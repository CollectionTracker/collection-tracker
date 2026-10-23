# Collection Tracker

Track a Pokémon trading card collection and its value over time. Import a CSV, sync daily prices from the [Pokémon TCG API](https://pokemontcg.io), and see totals, gains, movers and breakdowns on a dashboard.

## What it will look like

This is the target design from the Stitch renders (source files in [`.renders/`](.renders/)). The current app has the colours, fonts and card styling, but not yet the sealed inventory, valuation ranges, scenarios or multi-currency views. Those are tracked in the [project roadmap](https://github.com/users/JakeDeFord/projects/3).

![Target dashboard design](.renders/pokevault_portfolio_marketing_intelligence_dashboard_multi_currency/screen.png)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

With no configuration the app uses an embedded Postgres (PGlite) stored in `.data/`, so it runs with zero setup.

`npm run dev` starts with a pre-filled demo collection (cards, sealed products and price history) in `.data/pglite-demo`, separate from your real data. Delete that folder to regenerate it, or set `SEED_DEV_DATA=0` to use your real database in dev.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Use a real Postgres server instead of the embedded one. |
| `POKEMONTCG_API_KEY` | Optional API key for higher Pokémon TCG API rate limits. |
| `CRON_SECRET` | Secret that protects the `/api/cron/sync` endpoint. |
| `SEED_DEV_DATA` | Set to `0` to skip the demo data in `npm run dev`. |

## Scripts

- `npm run dev` – start the dev server
- `npm run build` / `npm start` – production build and server
- `npm run lint` – lint

## Tech

Next.js, React, Tailwind CSS, Drizzle ORM, Postgres (PGlite for local), Recharts.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
