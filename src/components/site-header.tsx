import Link from "next/link";
import { CurrencyMenu } from "@/components/currency-menu";
import { HeaderDrawer } from "@/components/header-drawer";
import { ViewTabs } from "@/components/view-tabs";

export function SiteHeader() {
  return (
    <header className="relative border-b border-white/5 bg-inset">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 gap-y-3 page-x py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold tracking-[-0.03em]">PokeVault</span>
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-mint">Analytics</span>
        </Link>
        <ViewTabs />
        <div className="hidden lg:block">
          <CurrencyMenu />
        </div>
        <HeaderDrawer currency={<CurrencyMenu align="left" />} />
      </div>
    </header>
  );
}
