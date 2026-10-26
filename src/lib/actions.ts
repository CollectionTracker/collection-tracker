import { type SealedPriceInput, setSealedPrice } from "./sealed-prices";
import { type SnapshotLabelInput, setSnapshotLabel } from "./snapshots";

// Writes from forms, returning an error message instead of throwing so the form can show it.
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function setSealedPriceAction(input: SealedPriceInput) {
  try {
    return { ok: true as const, price: await setSealedPrice(input) };
  } catch (e) {
    return { ok: false as const, error: message(e) };
  }
}

export async function setSnapshotLabelAction(input: SnapshotLabelInput) {
  try {
    return { ok: true as const, snapshot: await setSnapshotLabel(input) };
  } catch (e) {
    return { ok: false as const, error: message(e) };
  }
}
