/** Download link for a CSV from `/api/export` (see `exportHref`). The server names the file. */
export function ExportLink({ href, className, children = "Export CSV" }: { href: string; className?: string; children?: string }) {
  return (
    <a
      href={href}
      download
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-4 py-2 font-label text-label-md text-ink hover:brightness-125"
      }
    >
      <svg aria-hidden className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      </svg>
      {children}
    </a>
  );
}
