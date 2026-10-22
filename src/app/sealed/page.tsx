import type { Metadata } from "next";
import { ViewPlaceholder } from "@/components/view-placeholder";

export const metadata: Metadata = { title: "Sealed Inventory · Collection Tracker" };

export default function Page() {
  return <ViewPlaceholder eyebrow="Sealed products" title="Sealed Inventory" note="Sealed inventory arrives with its own epic." />;
}
