import type { CSSProperties, ReactNode } from "react";

/** Design-system accent colours a chip can take; any CSS colour also works. */
export const chipTones = {
  mint: "var(--color-mint)",
  sky: "var(--color-sky)",
  violet: "var(--color-violet-soft)",
  amber: "var(--color-amber)",
  rose: "var(--color-rose-400)",
  neutral: "var(--color-slate-2)",
} as const;

export type ChipTone = keyof typeof chipTones;

/** 6px status dot; `pulse` adds a ping halo (skipped when the user prefers reduced motion). */
export function StatusDot({ pulse = false }: { pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-1.5 shrink-0" aria-hidden>
      {pulse && <span className="absolute inset-0 rounded-full bg-current opacity-75 motion-safe:animate-ping" />}
      <span className="relative size-1.5 rounded-full bg-current" />
    </span>
  );
}

/**
 * Data chip / status badge per DESIGN.md: tinted fill at 10%, 1px border at 20%,
 * Space Grotesk uppercase 11px, with an optional leading status dot.
 */
export function StatusChip({
  tone = "sky",
  dot = false,
  pulse = false,
  className = "",
  title,
  children,
}: {
  /** A design tone, or a CSS colour such as a scenario colour. */
  tone?: ChipTone | (string & {});
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  const color = tone in chipTones ? chipTones[tone as ChipTone] : tone;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-(--chip)/20 bg-(--chip)/10 px-2.5 py-0.5 font-label text-label-sm font-bold uppercase text-(--chip) tabular-nums ${className}`}
      style={{ "--chip": color } as CSSProperties}
      title={title}
    >
      {(dot || pulse) && <StatusDot pulse={pulse} />}
      {children}
    </span>
  );
}
