import { Suspense } from "react";
import { connection } from "next/server";
import { CurrencySelector } from "@/components/currency-selector";
import { getCurrency } from "@/lib/currency-pref";
import { getFxRates } from "@/lib/forex";

async function CurrencyMenuInner({ align }: { align?: "left" | "right" }) {
  await connection(); // rates are read per request (and refreshed by date), never prerendered
  const [currency, fx] = await Promise.all([getCurrency(), getFxRates()]);
  return <CurrencySelector currency={currency} fx={fx} align={align} />;
}

/** Currency selector with the visitor's saved currency and today's rates; a same-size placeholder while it loads. */
export function CurrencyMenu({ align }: { align?: "left" | "right" }) {
  return (
    <Suspense fallback={<span aria-hidden className="block h-[30px] w-28 rounded-lg border border-white/10 bg-surface" />}>
      <CurrencyMenuInner align={align} />
    </Suspense>
  );
}
