import assert from "node:assert/strict";
import { test } from "node:test";
import { FALLBACK_RATES } from "./currencies";
import { compactMoney, money, moneyFor, signedMoney, wholeMoney } from "./format";

const fx = { rates: FALLBACK_RATES };
const JPY = moneyFor("JPY", fx); // 154.5 per USD
const EUR = moneyFor("EUR", fx); // 0.92
const CHF = moneyFor("CHF", fx); // 0.88

test("USD by default", () => {
  assert.equal(money(1234.5), "$1,234.50");
  assert.equal(money(-1234.5), "-$1,234.50");
  assert.equal(money(0), "$0.00");
  assert.equal(wholeMoney(36_233.6), "$36,234");
  assert.equal(signedMoney(12), "+$12.00");
  assert.equal(signedMoney(-3.4), "−$3.40");
  assert.equal(compactMoney(229.4), "$229");
  assert.equal(compactMoney(3100), "$3.1k");
  assert.equal(compactMoney(1_200_000), "$1.2M");
});

test("converts and uses the currency's symbol and decimals", () => {
  assert.equal(money(100, EUR), "€92.00");
  assert.equal(money(1234.56, JPY), "¥190,740");
  assert.equal(money(10, CHF), "Fr8.80");
  assert.equal(wholeMoney(1000.4, EUR), "€920");
  assert.equal(signedMoney(-10, JPY), "−¥1,545");
  assert.equal(signedMoney(10, EUR), "+€9.20");
});

test("compact format from the render: $16.8k, ¥2.6M", () => {
  assert.equal(compactMoney(16_800), "$16.8k");
  assert.equal(compactMoney(16_800, JPY), "¥2.6M");
  assert.equal(compactMoney(21_400, EUR), "€19.7k");
  assert.equal(compactMoney(5, JPY), "¥773");
  assert.equal(compactMoney(-3100), "-$3.1k");
});

test("rounding edges", () => {
  assert.equal(compactMoney(999.6), "$1.0k");
  assert.equal(compactMoney(999_960), "$1.0M");
  assert.equal(money(-0.001), "$0.00");
  assert.equal(money(-0.4, JPY), "-¥62");
  assert.equal(compactMoney(-0.2), "$0");
});
