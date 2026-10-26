import { ClientData } from "@/components/data-provider";
import { FooterStatus } from "@/components/footer-status";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-inset">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 page-x py-4 font-label text-label-eyebrow font-normal uppercase text-slate-2 md:flex-row">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink">PokeVault Analytics</span>
          <span>/</span>
          <span>TCGdex catalog + TCGplayer prices via TCGCSV</span>
        </div>
        <ClientData fallback={null}>
          <FooterStatus />
        </ClientData>
      </div>
    </footer>
  );
}
