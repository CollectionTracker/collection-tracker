# Collection Tracker

Track a Pokémon trading card collection and its value over time. Import a CSV, sync TCGplayer prices for cards and sealed products (catalog from [TCGdex](https://tcgdex.dev), prices from [TCGCSV](https://tcgcsv.com), both free with no API key; see [docs/pricing.md](docs/pricing.md)), and see totals, gains, movers and breakdowns on a dashboard.

## What it will look like

This is the target design from the Stitch renders (source files in [`.renders/`](.renders/)). The current app has the colours, fonts and card styling, but not yet the sealed inventory, valuation ranges, scenarios or multi-currency views. Those are tracked in the [project roadmap](https://github.com/users/JakeDeFord/projects/3).

![Target dashboard design](.renders/pokevault_portfolio_marketing_intelligence_dashboard_multi_currency/screen.png)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Where your data lives

The collection is stored **in your browser**, not on the server: an embedded Postgres (PGlite) saved in the browser's IndexedDB. Everyone who opens a hosted copy gets their own private collection, and the server keeps nothing (it only forwards price requests to TCGCSV). This means:

- Another browser or computer starts with an empty collection; collections don't sync between devices.
- Clearing the browser's site data for the app deletes the collection. Use **Export CSV** to keep a backup, and **Import CSV** to restore it.
- Prices sync when you open the app (if the last sync is over 36 hours old) or press **Sync prices**, so value history only has points for days you used it.

`npm run dev` starts with a pre-filled demo collection (cards, sealed products and price history) in a separate `collection-tracker-demo` browser database, so it never mixes with your real data. Delete that IndexedDB database in the browser's dev tools to regenerate it, or set `SEED_DEV_DATA=0` to use your real collection in dev.

### Opening it from another computer

Browsers only run the in-browser database on HTTPS or `localhost`, so `http://<this computer's IP>:3000` shows "This page couldn't load" on other machines. Serve it over HTTPS instead:

```bash
npm run serve:lan
```

This builds the app (`npm run start:lan` skips the build and serves the last one), then starts the app on `127.0.0.1:3000` and an HTTPS proxy on port `3443` on every network interface, and prints the addresses to open, e.g. `https://192.168.7.153:3443`. The first run creates a self-signed certificate in `.certs/` (it needs `openssl`) and makes a new one whenever this computer's IP addresses change. Each browser warns about the certificate the first time; choose **Advanced → Proceed** (Chrome, Edge) or **Accept the risk** (Firefox). Allow port 3443 through the firewall if needed (e.g. `sudo ufw allow 3443/tcp`). Remember the other computer gets its own, empty collection (see above): move data between them with Export CSV and Import CSV.

### Environment variables

| Variable | Purpose |
|---|---|
| `SEED_DEV_DATA` | Set to `0` to skip the demo data in `npm run dev`. |
| `PORT`, `HTTPS_PORT` | Ports `npm run start:lan` uses for the app (default `3000`, local only) and the HTTPS proxy (default `3443`). |

## Scripts

- `npm run dev` – start the dev server
- `npm run build` / `npm start` – production build and server
- `npm run serve:lan` – build, then serve over HTTPS to other computers on the network
- `npm run start:lan` – serve the last build over HTTPS to the network, without rebuilding
- `npm run lint` – lint
- `npm test` – unit tests
- `npm run db:bundle` – bundle the `drizzle/` migrations for the browser (runs before `dev` and `build`; run it after `drizzle-kit generate`)

## Tech

Next.js, React, Tailwind CSS, Drizzle ORM, PGlite (Postgres in the browser), Recharts.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
