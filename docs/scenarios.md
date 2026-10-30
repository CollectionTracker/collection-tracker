# Scenarios and simulation

The Scenarios & Growth view shows two things: three stress tests and a simulated range. Both are illustrative, not predictions. The logic is in `src/lib/scenarios.ts` and `src/lib/simulation.ts`.

## Stress tests

- Raw cards and sealed products are projected separately from their midpoints, then added together.
- Both follow a central growth path (`SEGMENT_GROWTH`). The rate holds through year 2, then fades towards `LONG_RUN_RATE` (3.5 %), halving the gap every 3 years.
- Each stress test (`DEFAULT_SCENARIOS`) adds one-off market moves in chosen years, per segment: Market correction, Reprint wave and Boom then bust. Without those moves it would follow the central path, which is close to the simulated median.
- They are what-ifs, not cases ranked by likelihood. The moves are hand-set, not measured from past events.

## Simulation

`simulate()` runs 5,000 yearly paths from a fixed seed, so the chart is stable between renders. It picks a market regime each year (boom, flat or bust) from a transition table, then each segment's log return is:

```
growth + beta × market move + segment noise + holding noise × √(concentration)
```

- **Growth** is the central path above.
- **Market move** comes from the regime and is shared, so raw and sealed fall together. It is centred on zero, so the median path stays close to the growth path.
- **Concentration** is the segment's Herfindahl index (sum of squared value shares). It is an approximation of simulating each holding: a collection dominated by one card gets a wider range.

The Simulated chances panel reads from the same paths: ending below today's midpoint, ending below cost, and a 40 % fall from a peak. When only some holdings have a known cost, break-even is scaled from those holdings to the whole portfolio. Drawdowns are measured on market value, before fees and inflation.

## Limits

- **All parameters are hand-set** (`REGIMES`, `REGIME_TRANSITIONS`, `SEGMENT_RISK`, `SEGMENT_GROWTH`). None is fitted to price history yet, so the percentages show what these assumptions imply, not measured odds.
- Sealed products are one segment. They have no release date in the database, so growth doesn't vary with a product's age.
- Holdings are valued as they stand: no purchases, sales, or changes in condition or grading.

## Display basis

Values default to after the illustrative 13 % selling fee (`SELLING_FEE_PCT`), applied in every year including year 0. "Today's money" deflates by `INFLATION_RATE` (2.5 %). Multipliers always compare against the full starting midpoint. Taxes and shipping are not deducted.
