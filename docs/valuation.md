# Low / mid / high valuation

Every figure has a **mid** (the best single estimate) and a **low** / **high** bracket. `getDashboard()` returns them as `{ low, mid, high }` for raw cards (`rawValuation`), sealed (`sealed.valuation`) and the combined portfolio (`combined.valuation`). Each sealed holding also has its own `valuation`.

## Method

- **Mid** is the current market value: latest market price × quantity.
- **Low / high** for a sealed product use the low and high entered with its latest price (`setSealedPrice`), multiplied by quantity. When one is missing it is derived as a spread around mid.
- **Spread** (derived low/high): `low = mid × (1 − spread)`, `high = mid × (1 + spread)`. Defaults: **10 %** for raw cards, **15 %** for sealed (thinner markets, preorder and condition uncertainty). They live in `DEFAULT_SPREAD` in `src/lib/valuation.ts`.
- Raw cards always use the spread. The Pokémon TCG API's per-variant low/high are the cheapest and dearest listings, which are far too wide to be a useful range.
- An entered low is capped at mid and an entered high is floored at mid, so `low ≤ mid ≤ high` always holds.
- **Totals** are the sums of the parts: the floor is the sum of lows, the ceiling the sum of highs, the midpoint the sum of mids. This is deliberately conservative and optimistic: it assumes every holding moves the same way at once.
- Products with no price entered yet are worth 0 at all three points.

The range is an illustration of uncertainty, not a prediction or a realised sale price.
