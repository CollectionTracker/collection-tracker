import Link from "next/link";

export const VIEWS = [
  { href: "/", label: "Overview" },
  { href: "/sealed", label: "Sealed Inventory" },
  { href: "/raw", label: "Raw Cards" },
  { href: "/scenarios", label: "Scenarios & Growth" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-white/5 bg-inset">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 md:px-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold tracking-[-0.03em]">PokeVault</span>
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-mint">Analytics</span>
        </Link>
        <nav aria-label="Views" className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-2">
          {VIEWS.map((v) => (
            <Link key={v.href} href={v.href} className="hover:text-ink">
              {v.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
