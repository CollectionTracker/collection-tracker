import type { Metadata } from "next";
import { ViewPlaceholder } from "@/components/view-placeholder";

export const metadata: Metadata = { title: "Scenarios & Growth · Collection Tracker" };

export default function Page() {
  return <ViewPlaceholder eyebrow="Scenarios" title="Scenarios & Growth" note="Scenarios and projections arrive with their own epic." />;
}
