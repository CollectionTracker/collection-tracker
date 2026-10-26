"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PREVIEW_ATTR, PREVIEW_SHAPE_ATTR, type PreviewShape } from "@/lib/card-preview";

// Card art is 63:88; sealed product photos are shown whole in a square. One layer serves every card and
// product on the page through event delegation, so rows carry only data attributes: no per-row listeners,
// state or hidden images.
const SIZES: Record<PreviewShape, { w: number; h: number }> = { card: { w: 250, h: 349 }, square: { w: 300, h: 300 } };
const GAP = 24;
const EDGE = 8;
const DELAY = 120; // hover intent, so sweeping across a table does not fetch every card

export function CardPreviewLayer() {
  const box = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [shape, setShape] = useState<PreviewShape>("card");
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    let target: Element | null = null;
    let open = false;
    let timer = 0;
    let frame = 0;
    let x = 0;
    let y = 0;
    let size = SIZES.card;

    // Position is written straight to the DOM once per frame; React only renders when the card changes.
    const place = () => {
      frame = 0;
      const el = box.current;
      if (!el) return;
      const { w, h } = size;
      let left = x + GAP;
      if (left + w > window.innerWidth - EDGE) left = x - GAP - w;
      left = Math.max(EDGE, left);
      const top = Math.max(EDGE, Math.min(y - h / 2, window.innerHeight - h - EDGE));
      el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    const show = (next: string, nextShape: PreviewShape) => {
      open = true;
      size = SIZES[nextShape];
      schedule();
      setSrc(next);
      setShape(nextShape);
      setVisible(true);
    };
    const hide = () => {
      clearTimeout(timer);
      target = null;
      if (open) {
        open = false;
        setVisible(false); // keep the last image mounted so it fades out instead of vanishing
      }
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return; // touch and pen get no hover preview
      const el = e.target instanceof Element ? e.target.closest(`[${PREVIEW_ATTR}]`) : null;
      if (el === target) return;
      if (!el) return hide();
      clearTimeout(timer);
      target = el;
      x = e.clientX;
      y = e.clientY;
      const next = el.getAttribute(PREVIEW_ATTR)!;
      const nextShape: PreviewShape = el.getAttribute(PREVIEW_SHAPE_ATTR) === "square" ? "square" : "card";
      // Moving from one card straight to the next swaps at once; a fresh hover waits for intent.
      if (open) show(next, nextShape);
      else timer = window.setTimeout(() => show(next, nextShape), DELAY);
    };
    const onMove = (e: PointerEvent) => {
      if (!target) return;
      x = e.clientX;
      y = e.clientY;
      if (open) schedule();
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) hide(); // pointer left the window
    };

    const opts = { passive: true } as const;
    document.addEventListener("pointerover", onOver, opts);
    document.addEventListener("pointermove", onMove, opts);
    document.addEventListener("pointerout", onOut, opts);
    document.addEventListener("pointerdown", hide, opts); // clicks can re-render or remove the row
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("blur", hide);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerdown", hide);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("blur", hide);
    };
  }, []);

  const { w, h } = SIZES[shape];
  return (
    <div
      ref={box}
      aria-hidden
      style={{ width: w, height: h }}
      className={`pointer-events-none fixed left-0 top-0 z-50 overflow-hidden rounded-[14px] border border-white/10 bg-surface-2 shadow-2xl shadow-black/60 transition-opacity duration-150 will-change-transform ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {src && (
        <Image
          key={src}
          src={src}
          alt=""
          width={w}
          height={h}
          loading="eager"
          onLoad={() => setLoaded(src)}
          className={`size-full transition-opacity duration-150 ${shape === "square" ? "bg-white object-contain p-3" : "object-cover"} ${loaded === src ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
