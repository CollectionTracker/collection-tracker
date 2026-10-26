# Currency

All prices are stored in USD (TCGplayer prices via TCGCSV and manual sealed prices are USD). Other currencies are a display conversion: `amount × rate`, where the rate is units of that currency per 1 USD.

## Supported currencies

USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, HKD, NZD (`CURRENCIES` in `src/lib/currencies.ts`).

## Rate source

[Frankfurter](https://frankfurter.dev), which serves the European Central Bank reference rates. It is free, needs no API key and covers every supported currency. The ECB publishes once per working day (around 16:00 CET), with no rates at weekends or on TARGET holidays.

## Storage and caching

- Rates are stored in the `fx_rates` table, one row per rate day and currency, under the ECB publication date (not the fetch date).
- They are refreshed by the price sync (automatic when the app is opened with stale prices, or the Sync prices button) and, if that has not run, lazily on the first page load of the day. They are fetched at most once per day.
- A failed fetch never fails the price sync or a page load. Page loads wait an hour before retrying.

## Fallbacks

`getFxRates(asOf?)` in `src/lib/forex.ts` picks one rate per currency:

1. The latest stored rate on or before the day (today, or the selected snapshot day).
2. For a day before rates were first stored, the earliest stored rate.
3. If a currency has never been stored (e.g. first run offline), the built-in `FALLBACK_RATES`. The result lists these currencies in `fallback`.

## Formatting

The helpers in `src/lib/format.ts` take a USD amount and a display context, `Money = { currency, rate }` (build it with `moneyFor(currency, fx)`; it defaults to USD):

| Helper | Use | USD | JPY |
|---|---|---|---|
| `money` | full amounts, with the currency's decimals | $1,234.50 | ¥190,740 |
| `wholeMoney` | rough figures such as projections | $36,234 | ¥5,598,153 |
| `compactMoney` | tight spaces and chart axes | $16.8k | ¥2.6M |
| `signedMoney` | changes | +$12.00 | +¥1,854 |

Symbols and decimals come from `CURRENCY_INFO` in `src/lib/currencies.ts` and follow the design render: CAD, AUD, HKD and NZD show `$`, CNY shows `¥` and CHF shows `Fr`, so the currency code appears in the selector. JPY has no decimals. An amount that rounds to zero never shows a minus sign.

## Selected currency

The header has a currency selector (in the menu drawer below 1024px). The choice is stored in the `currency` cookie (one year, `SameSite=Lax`) by the `setCurrencyAction` server action. Server components read it with `getCurrency()` from `src/lib/currency-pref.ts`, which falls back to USD for a missing or unknown value. It reads a cookie, so call it inside a `<Suspense>` boundary.

## Applying the currency

Server pages call `getDisplayMoney(asOf?)` (in `src/lib/currency-pref.ts`) once and pass the `Money` it returns down as an `m` prop. It is plain data, so client components get it too. Every amount goes through `money`, `wholeMoney`, `compactMoney` or `signedMoney` with that `m`.

- **One rate per page:** the selected currency's rate for the day being shown. That is today, or the snapshot day on the Overview. History, comparisons and projections all use that one rate, so they show changes in the portfolio, not in exchange rates. Percentages are unaffected.
- **Charts** convert their data (`value * m.rate`) before plotting and format with `converted(m)` (rate 1). Axis ticks are then round numbers in the display currency, not converted round dollars.
