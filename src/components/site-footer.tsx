import { Suspense } from "react";
import { connection } from "next/server";
import { FooterStatus } from "@/components/footer-status";
import { listSnapshots } from "@/lib/snapshots";

async function Status() {
  await connection();
  const snapshots = await listSnapshots();
  return (
    <Suspense fallback={null}>
      <FooterStatus days={snapshots.map((s) => s.day)} />
    </Suspense>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-inset">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 page-x py-4 font-label text-label-eyebrow font-normal uppercase text-slate-2 md:flex-row">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink">PokeVault Analytics</span>
          <span>/</span>
          <span>Pokémon TCG API + manual sealed prices</span>
        </div>
        <Suspense fallback={null}>
          <Status />
        </Suspense>
      </div>
    </footer>
  );
}
