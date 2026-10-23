// Hover previews are opt-in per element: spread `cardPreview(card)` onto any card row or tile and the
// single <CardPreviewLayer> in the root layout shows the full card art next to the cursor.
export const PREVIEW_ATTR = "data-card-preview";

type Previewable = { image: string | null; imageLarge: string | null };

/** Attributes that turn on the hover preview for a card. Pass `enabled = false` (or a card with no art) to leave it off. */
export function cardPreview(card: Previewable, enabled = true): { [PREVIEW_ATTR]?: string } {
  const src = card.imageLarge ?? card.image;
  return enabled && src ? { [PREVIEW_ATTR]: src } : {};
}
