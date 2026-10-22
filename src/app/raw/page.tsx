import type { Metadata } from "next";
import { ViewPlaceholder } from "@/components/view-placeholder";

export const metadata: Metadata = { title: "Raw Cards · Collection Tracker" };

export default function Page() {
  return <ViewPlaceholder eyebrow="Raw cards" title="Raw Cards" note="Raw card analytics arrive with their own epic." />;
}
