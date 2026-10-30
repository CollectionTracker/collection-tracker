# Scenarios and simulation

The Scenarios & Growth view shows two things: three what-if lines and a simulated range. Both are illustrative, not predictions. The logic is in `src/lib/scenarios.ts` and `src/lib/simulation.ts`.

## Scenarios

- Raw cards and sealed products are projected separately from their midpoints, then added together.
- Each scenario sets a year 1 shift and an annual rate per segment (`DEFAULT_SCENARIOS`).
- The rate holds through year 2, then fades towards `LONG_RUN_RATE` (3.5 %), halving the gap every 3 years. A rate below the long-run rate fades up.

## Simulation

`simulate()` runs 5,000 yearly paths from a fixed seed, so the chart is stable between renders. It picks a market regime each year (boom, flat or bust) from a transition table, then each segment's log return is:

```
growth + beta × market move + segment noise + holding noise × √(concentration)
```

- **Growth** is the Moderate scenario's rate, faded as above (`SEGMENT_GROWTH`).
- **Market move** comes from the regime and is shared, so raw and sealed fall together. It is centred on zero, so the median path stays close to the growth path.
- **Concentration** is the segment's Herfindahl index (sum of squared value shares). It is an approximation of simulating each holding: a collection dominated by one card gets a wider range.

The Simulated chances panel reads from the same paths: ending below today's midpoint, ending below cost, and a 40 % fall from a peak. When only some holdings have a known cost, break-even is scaled from those holdings to the whole portfolio. Drawdowns are measured on market value, before fees and inflation.

## Limits

- **All parameters are hand-set** (`REGIMES`, `REGIME_TRANSITIONS`, `SEGMENT_RISK`, `SEGMENT_GROWTH`). None is fitted to price history yet, so the percentages show what these assumptions imply, not measured odds.
- Sealed products are one segment. They have no release date in the database, so growth doesn't vary with a product's age.
- Holdings are valued as they stand: no purchases, sales, or changes in condition or grading.

## Display basis

Values default to after the illustrative 13 % selling fee (`SELLING_FEE_PCT`), applied in every year including year 0. "Today's money" deflates by `INFLATION_RATE` (2.5 %). Multipliers always compare against the full starting midpoint. Taxes and shipping are not deducted.
