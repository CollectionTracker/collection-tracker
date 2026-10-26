import Image from "next/image";
import type { ReactNode } from "react";
import { sealedTypeLabel } from "@/lib/sealed-breakdown";

// Line drawings on a 32×32 grid, one per product type, for products without a TCGplayer photo.
const GLYPHS: Record<string, { label: string; color: string; paths: ReactNode }> = {
  etb: {
    label: "ETB",
    color: "var(--color-mint)",
    paths: (
      <>
        <rect x="6" y="9" width="20" height="17" rx="1.5" />
        <path d="M6 14h20M13 9V6.5h6V9" />
      </>
    ),
  },
  booster_box: {
    label: "BOX",
    color: "var(--color-sky)",
    paths: (
      <>
        <path d="M5 12l11-5 11 5v11l-11 5-11-5z" />
        <path d="M5 12l11 5 11-5M16 17v11" />
      </>
    ),
  },
  case: {
    label: "CASE",
    color: "var(--color-violet-soft)",
    paths: (
      <>
        <rect x="5" y="7" width="10" height="9" rx="1" />
        <rect x="17" y="7" width="10" height="9" rx="1" />
        <rect x="5" y="18" width="10" height="9" rx="1" />
        <rect x="17" y="18" width="10" height="9" rx="1" />
      </>
    ),
  },
  upc: {
    label: "UPC",
    color: "var(--color-amber)",
    paths: (
      <>
        <rect x="4" y="8" width="24" height="18" rx="1.5" />
        <path d="M16 11.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" />
      </>
    ),
  },
  bundle: {
    label: "BNDL",
    color: "var(--color-sky)",
    paths: (
      <>
        <rect x="7" y="5" width="13" height="20" rx="1.5" transform="rotate(-8 13 15)" />
        <rect x="12" y="7" width="13" height="20" rx="1.5" transform="rotate(8 18 17)" />
      </>
    ),
  },
  tin: {
    label: "TIN",
    color: "var(--color-slate-2)",
    paths: (
      <>
        <ellipse cx="16" cy="9" rx="10" ry="3.5" />
        <path d="M6 9v14c0 1.9 4.5 3.5 10 3.5s10-1.6 10-3.5V9" />
      </>
    ),
  },
  other: {
    label: "ITEM",
    color: "var(--color-slate-2)",
    paths: (
      <>
        <rect x="6" y="12" width="20" height="14" rx="1.5" />
        <path d="M5 8h22v4H5zM16 8v18M16 8c-2-4-7-4-6 0M16 8c2-4 7-4 6 0" />
      </>
    ),
  },
};

/**
 * Square thumbnail for a sealed product: its TCGplayer photo when it has one, else a drawing for its
 * product type. `size` is the edge in px.
 */
export function SealedThumb({ image, productType, size = 40, eager = false }: { image: string | null; productType: string; size?: number; eager?: boolean }) {
  const box = "relative shrink-0 overflow-hidden rounded-md bg-white/[0.04] ring-1 ring-white/5";
  if (image)
    return (
      <span className={box} style={{ width: size, height: size }}>
        <Image src={image} alt="" fill sizes={`${size}px`} loading={eager ? "eager" : undefined} className="object-contain p-0.5" />
      </span>
    );
  const g = GLYPHS[productType] ?? GLYPHS.other;
  return (
    <span className={`${box} grid place-items-center`} style={{ width: size, height: size, color: g.color }} title={`${sealedTypeLabel(productType)} (no photo)`}>
      <svg viewBox="0 0 32 32" className="w-[62%]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
        {g.paths}
      </svg>
      {size >= 56 && <span className="absolute bottom-1 font-label text-[9px] font-bold tracking-wider">{g.label}</span>}
    </span>
  );
}
