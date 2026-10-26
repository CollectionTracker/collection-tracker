import { productImageAt } from "./tcgcsv";

// Hover previews are opt-in per element: spread `cardPreview(card)` (or `sealedPreview(product)`) onto any
// row or tile and the single <CardPreviewLayer> in the root layout shows the full image next to the cursor.
export const PREVIEW_ATTR = "data-card-preview";
// "square" for sealed product photos, shown whole; absent for card art (63:88).
export const PREVIEW_SHAPE_ATTR = "data-card-preview-shape";
export type PreviewShape = "card" | "square";

type Previewable = { image: string | null; imageLarge: string | null };

/** Attributes that turn on the hover preview for a card. Pass `enabled = false` (or a card with no art) to leave it off. */
export function cardPreview(card: Previewable, enabled = true): { [PREVIEW_ATTR]?: string } {
  const src = card.imageLarge ?? card.image;
  return enabled && src ? { [PREVIEW_ATTR]: src } : {};
}

/** Attributes that turn on the hover preview for a sealed product's TCGplayer photo; none when it has no photo. */
export function sealedPreview(product: { image: string | null }): { [PREVIEW_ATTR]?: string; [PREVIEW_SHAPE_ATTR]?: PreviewShape } {
  return product.image ? { [PREVIEW_ATTR]: productImageAt(product.image, "in_1000x1000"), [PREVIEW_SHAPE_ATTR]: "square" } : {};
}
