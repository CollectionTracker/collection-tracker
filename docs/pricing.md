# Prices and catalog

Card and sealed prices are TCGplayer's, in USD, refreshed by the price sync, which runs in the browser when the app is opened with prices older than 36 hours, or with the Sync prices button. Prices are stored in the browser's own database, so history only has points for days the app was used. No API keys are needed.

| Source | Used for | Notes |
|---|---|---|
| [TCGdex](https://tcgdex.dev) (`api.tcgdex.net/v2/en`) | Card catalog: names, numbers, rarity, images, sets, and each card's TCGplayer product id | Open source, no key. Its own TCGplayer prices lag by days, so they are only a fallback. |
| [TCGCSV](https://tcgcsv.com) (`tcgcsv.com/tcgplayer/3`) | Daily TCGplayer market / low / mid / high for cards and sealed products | Mirrors TCGplayer's API once a day around 20:00 UTC. Server-side only, with a User-Agent and a pause between requests: the browser calls it through this app's `/api/tcgcsv/...` proxy, which adds the User-Agent. |

The Pokémon TCG API (`api.pokemontcg.io`) was used before; it goes offline on 1 March 2027.

## Cards

- Card ids stored before the move are Pokémon TCG API ids (`sv3pt5-199`). They are kept, so entries and price history don't move, and mapped to the TCGdex id (`sv03.5-199`) in `cards.tcgdex_id`. New cards use TCGdex ids. Set ids work the same way (`sets.tcgdex_id`).
- The first sync after a card is added links it to its TCGplayer product and TCGCSV group (`cards.tcgplayer_product_id`, `tcgplayer_group_id`): the group by set name, abbreviation and release date, the product by the id TCGdex gives or else by collector number.
- After that a sync costs one TCGCSV request per set. If TCGCSV has no price for a card, or can't be reached, TCGdex's TCGplayer price is stored instead.
- Variants use the TCGplayer printing names in camel case: `normal`, `holofoil`, `reverseHolofoil`, `1stEditionHolofoil`, `unlimitedHolofoil`, ...
- When TCGplayer has too few sales for a market price, the median listing (mid) is used as the market price.
- CSV import accepts our ids, TCGdex ids and Pokémon TCG API ids, or a set (id or name) with a number or card name.

## Sealed products

- Each product is linked once to a TCGplayer product (`sealed_products.tcgplayer_product_id`, `tcgplayer_group_id`): the group from its set group (or the start of its name), the product by name. Cases, displays and Pokémon Center products only match names that say so, and a tie or weak match is left unlinked. A SKU that is a TCGplayer product id is used directly.
- Linked products get a daily price with `price_source = 'tcgcsv'`. A price entered by hand (`manual`) for the same day is never overwritten.
- Products that can't be matched (multi-set collections, promos) keep manual prices; the sync retries them each day.
- Valuation uses the default sealed spread around a TCGCSV price, not TCGplayer's low/high listings (see [valuation.md](valuation.md)).
