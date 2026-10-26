// Shapes shared by the add dialog (client) and the /api/add routes (server). Types only plus a few constants, so
// importing this never pulls server code into the browser.
import type { SealedProductType } from "@/db/schema";

export const SEALED_TYPES = ["etb", "booster_box", "case", "upc", "bundle", "tin", "other"] as const satisfies readonly SealedProductType[];
export const SEALED_TYPE_LABELS: Record<SealedProductType, string> = {
  etb: "ETB",
  booster_box: "Booster box",
  case: "Case",
  upc: "UPC",
  bundle: "Bundle",
  tin: "Tin",
  other: "Other",
};

export const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;
export type Condition = (typeof CONDITIONS)[number];

export type CardSuggestion = {
  kind: "card";
  /** TCGdex id, or ours for cards stored before TCGdex. */
  id: string;
  name: string;
  setName: string;
  number: string;
  rarity: string | null;
  image: string | null;
  /** Market price of the most common printing, or null when none is known. */
  price: number | null;
  variants: string[];
  /** Copies already in the collection. */
  owned: number;
};

export type SealedSuggestion = {
  kind: "sealed";
  /** TCGplayer product and group; null for a product typed in by hand. */
  productId: number | null;
  groupId: number | null;
  name: string;
  group: string | null;
  type: SealedProductType;
  image: string | null;
  price: number | null;
  owned: number;
};

export type Suggestion = CardSuggestion | SealedSuggestion;

export type SuggestionKind = "all" | "card" | "sealed";

/** Stable identity of a suggestion, so adding the same one twice raises the quantity. */
export const suggestionKey = (s: Suggestion) =>
  s.kind === "card" ? `card:${s.id}` : s.productId != null ? `sealed:${s.productId}` : `custom:${s.name.toLowerCase()}|${s.type}|${(s.group ?? "").toLowerCase()}`;

/** One line of the review list. `item` is null while an imported row still needs a match picked. */
export type DraftRow = {
  uid: string;
  item: Suggestion | null;
  /** What the file said for a row that is not matched yet. */
  query: string;
  candidates: Suggestion[];
  quantity: number;
  condition: Condition;
  /** Printing of a card; null takes the card's usual one. */
  variant: string | null;
  /** Price paid per copy or unit. */
  paid: number | null;
  note?: string;
};

export type CommitItem =
  | { kind: "card"; id: string; variant: string | null; condition: Condition; quantity: number; paid: number | null }
  | {
      kind: "sealed";
      name: string;
      type: SealedProductType;
      group: string | null;
      productId: number | null;
      groupId: number | null;
      quantity: number;
      paid: number | null;
    };

export type CommitResult = {
  cards: { entries: number; copies: number };
  sealed: { products: number; units: number };
  failed: string[];
};
