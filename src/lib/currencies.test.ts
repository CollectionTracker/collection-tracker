import assert from "node:assert/strict";
import { test } from "node:test";
import { CURRENCIES, FALLBACK_RATES, convert, isCurrency, parseRates, resolveRates } from "./currencies";

test("ten display currencies with USD as base", () => {
  assert.equal(CURRENCIES.length, 10);
  assert.equal(CURRENCIES[0], "USD");
  assert.equal(FALLBACK_RATES.USD, 1);
  assert.ok(isCurrency("JPY"));
  assert.ok(!isCurrency("SEK"));
});

test("parseRates keeps supported currencies and rejects bad responses", () => {
  const parsed = parseRates({
    amount: 1,
    base: "USD",
    date: "2026-10-23",
    rates: { EUR: 0.89342, JPY: 156.8, SEK: 9.4, USD: 1 },
  });
  assert.deepEqual(parsed, { day: "2026-10-23", rates: { EUR: 0.89342, JPY: 156.8 } });
  assert.throws(() => parseRates({ base: "EUR", date: "2026-10-23", rates: { USD: 1.1 } }));
  assert.throws(() => parseRates({ base: "USD", date: "2026-10-23", rates: { EUR: -1 } }));
  assert.throws(() => parseRates({ base: "USD", date: "2026-10-23", rates: { SEK: 9.4 } }));
  assert.throws(() => parseRates("<html>"));
});

const row = (day: string, currency: string, rate: number) => ({ day, currency, rate, source: "frankfurter" });

test("resolveRates uses stored rates and falls back per currency", () => {
  const fx = resolveRates([row("2026-10-22", "EUR", 0.9), row("2026-10-23", "JPY", 157)]);
  assert.equal(fx.rates.USD, 1);
  assert.equal(fx.rates.EUR, 0.9);
  assert.equal(fx.rates.JPY, 157);
  assert.equal(fx.rates.GBP, FALLBACK_RATES.GBP);
  assert.equal(fx.day, "2026-10-23");
  assert.equal(fx.source, "frankfurter");
  assert.deepEqual(fx.fallback, ["GBP", "CAD", "AUD", "CHF", "CNY", "HKD", "NZD"]);
});

test("resolveRates prefers rates on or before the day over later ones", () => {
  const fx = resolveRates([row("2026-01-02", "EUR", 0.95)], [row("2026-03-01", "EUR", 0.9), row("2026-03-01", "GBP", 0.8)]);
  assert.equal(fx.rates.EUR, 0.95);
  assert.equal(fx.rates.GBP, 0.8);
});

test("nothing stored gives the built-in rates", () => {
  const fx = resolveRates([]);
  assert.deepEqual(fx.rates, FALLBACK_RATES);
  assert.equal(fx.day, null);
  assert.equal(fx.fallback.length, 9);
  assert.equal(convert(100, "JPY", fx), 15_450);
});
