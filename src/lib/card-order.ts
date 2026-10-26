/**
 * Saved card order for a reorderable layout. Pure helpers, so the dashboard grid and the tests share one behaviour.
 * An order is a list of card ids; the saved list is only a preference and may be stale.
 */

/**
 * The order to show: the saved ids that still exist, in saved order, with any card missing from it (e.g. one added
 * after the order was saved) inserted at its default position. No saved order, or an unreadable one, gives the default.
 */
export function resolveOrder(defaults: readonly string[], saved: readonly string[] | null): string[] {
  if (!saved) return [...defaults];
  const known = new Set(defaults);
  const order = [...new Set(saved)].filter((id) => known.has(id));
  defaults.forEach((id, i) => {
    if (!order.includes(id)) order.splice(Math.min(i, order.length), 0, id);
  });
  return order;
}

/** Moves `id` to index `to` (clamped), shifting the cards in between. Unknown ids leave the order unchanged. */
export function moveCard(order: readonly string[], id: string, to: number): string[] {
  const from = order.indexOf(id);
  if (from === -1) return [...order];
  const next = order.filter((x) => x !== id);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, id);
  return next;
}

/** Moves `id` one place earlier (-1) or later (+1); the first and last cards stay put at the edges. */
export function shiftCard(order: readonly string[], id: string, by: -1 | 1): string[] {
  const from = order.indexOf(id);
  return from === -1 ? [...order] : moveCard(order, id, from + by);
}

/** Parses a stored order; anything other than a list of strings counts as no saved order. */
export function parseOrder(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every((x) => typeof x === "string") ? value : null;
  } catch {
    return null;
  }
}

/** True when the order is the default one, so nothing needs saving. */
export function isDefaultOrder(defaults: readonly string[], order: readonly string[]): boolean {
  return defaults.length === order.length && defaults.every((id, i) => order[i] === id);
}

/** Cards to show: the order without the hidden ids. Hidden ids that no longer exist are ignored. */
export function visibleOrder(order: readonly string[], hidden: readonly string[]): string[] {
  const gone = new Set(hidden);
  return order.filter((id) => !gone.has(id));
}

/**
 * Writes a new order of the visible cards back into the full order. Hidden cards keep their slots, so a card that is
 * added back returns where it was.
 */
export function applyVisibleOrder(order: readonly string[], hidden: readonly string[], visible: readonly string[]): string[] {
  const gone = new Set(hidden);
  let i = 0;
  return order.map((id) => (gone.has(id) ? id : (visible[i++] ?? id)));
}

/** The saved hidden ids that still exist, without duplicates. */
export function resolveHidden(defaults: readonly string[], saved: readonly string[] | null): string[] {
  const known = new Set(defaults);
  return [...new Set(saved ?? [])].filter((id) => known.has(id));
}

/** Hides `id`, or shows it again when `show` is true. Unknown ids leave the list unchanged. */
export function setHidden(hidden: readonly string[], id: string, show: boolean): string[] {
  const rest = hidden.filter((x) => x !== id);
  return show ? rest : [...rest, id];
}
