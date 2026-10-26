"use client";

import { type PointerEvent, type ReactNode, useEffect, useId, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  /** Small label above the title. */
  eyebrow?: ReactNode;
  footer?: ReactNode;
  /** Width cap from the `sm` breakpoint up, as a literal class so Tailwind sees it. */
  width?: string;
  onClose: () => void;
  children: ReactNode;
};

/** Distance in px a downward swipe on the grab handle must travel to dismiss the sheet. */
const SWIPE_CLOSE = 80;

/**
 * Modal detail view on a native <dialog>: focus is trapped and returned to the opener by the browser, Escape and a
 * click on the backdrop close it, and the page behind is inert while it is open. Below the `sm` breakpoint it is a
 * bottom sheet that slides up and can be swiped down from its grab handle; from `sm` up it is a centred modal.
 */
export function InspectDialog({ open, title, subtitle, eyebrow = "Detail inspection", footer, width = "sm:max-w-4xl", onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const swipe = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // The sheet follows the finger by writing its transform straight to the DOM, so a swipe never re-renders.
  const onSwipeStart = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    swipe.current = { y: e.clientY, dy: 0 };
    ref.current!.style.transition = "none";
  };
  const onSwipeMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!swipe.current) return;
    swipe.current.dy = Math.max(0, e.clientY - swipe.current.y);
    ref.current!.style.transform = `translateY(${swipe.current.dy}px)`;
  };
  const onSwipeEnd = () => {
    const dy = swipe.current?.dy ?? 0;
    swipe.current = null;
    const dialog = ref.current!;
    dialog.style.transition = "";
    dialog.style.transform = "";
    if (dy > SWIPE_CLOSE) onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // The dialog box fills the element, so a click whose target is the <dialog> itself landed on the backdrop.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`mx-auto mb-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl border border-b-0 border-white/10 bg-surface p-0 text-ink shadow-2xl backdrop:bg-canvas/80 backdrop:backdrop-blur-md motion-safe:transition-transform motion-safe:duration-300 motion-safe:starting:translate-y-full sm:m-auto sm:max-h-[90vh] sm:w-[calc(100%-2rem)] sm:rounded-2xl sm:border-b sm:motion-safe:starting:translate-y-0 ${width}`}
    >
      {open && (
        <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-8">
          <div
            aria-hidden
            onPointerDown={onSwipeStart}
            onPointerMove={onSwipeMove}
            onPointerUp={onSwipeEnd}
            onPointerCancel={onSwipeEnd}
            className="-mx-6 -mt-6 mb-2 flex cursor-grab touch-none justify-center pb-2 pt-3 sm:hidden"
          >
            <span className="h-1 w-10 rounded-full bg-white/20" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            className="absolute right-5 top-7 rounded-xl bg-surface-2 p-2 text-slate-2 hover:text-ink sm:top-5"
          >
            <svg aria-hidden className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
          <header className="border-b border-white/5 pb-4 pr-12">
            <div className="font-label text-[11px] font-bold uppercase tracking-[0.12em] text-mint">{eyebrow}</div>
            <h2 id={titleId} className="mt-1 text-2xl font-extrabold tracking-[-0.02em]">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-xs text-slate-2">{subtitle}</p>}
          </header>
          <div className="py-6">{children}</div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-xs">
            <div className="text-slate-2">{footer}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-mint px-4 py-2 font-label text-[13px] font-bold tracking-wide text-canvas hover:brightness-110"
            >
              Done
            </button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
