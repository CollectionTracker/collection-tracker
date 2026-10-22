export function ViewPlaceholder({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 md:px-8">
      <header className="border-b border-white/5 pb-5">
        <div className="font-label text-[11px] font-bold uppercase leading-[14px] tracking-[0.12em] text-mint">{eyebrow}</div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] md:text-[40px] md:leading-[48px]">{title}</h1>
      </header>
      <p className="rounded-2xl border border-white/5 bg-surface p-5 py-16 text-center text-slate-2">{note}</p>
    </main>
  );
}
