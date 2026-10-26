export function ViewPlaceholder({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-3 py-6 page-x md:space-y-5">
      <header className="border-b border-white/5 pb-5">
        <div className="font-label text-label-eyebrow uppercase text-mint">{eyebrow}</div>
        <h1 className="mt-1 text-headline-xl-mobile md:text-headline-xl">{title}</h1>
      </header>
      <p className="rounded-2xl border border-white/5 bg-surface p-5 py-16 text-center text-slate-2">{note}</p>
    </main>
  );
}
