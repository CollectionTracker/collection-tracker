"use client";

import { ClientData, useData } from "@/components/data-provider";
import { CurrencySelector } from "@/components/currency-selector";
import { getCurrency } from "@/lib/currency-pref";
import { getFxRates } from "@/lib/forex";

function CurrencyMenuInner({ align }: { align?: "left" | "right" }) {
  const fx = useData(["fx"], () => getFxRates()); // refreshed by date on first read
  return <CurrencySelector currency={getCurrency()} fx={fx} align={align} />;
}

/** Currency selector with the visitor's saved currency and today's rates; a same-size placeholder while it loads. */
export function CurrencyMenu({ align }: { align?: "left" | "right" }) {
  return (
    <ClientData fallback={<span aria-hidden className="block h-[30px] w-28 rounded-lg border border-white/10 bg-surface" />}>
      <CurrencyMenuInner align={align} />
    </ClientData>
  );
}
