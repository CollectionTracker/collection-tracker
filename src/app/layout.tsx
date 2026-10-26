import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { SiteFooter } from "@/components/site-footer";
import { CardPreviewLayer } from "@/components/card-preview-layer";
import { AssetSheetProvider } from "@/components/asset-sheet";
import { AutoSync } from "@/components/auto-sync";
import { DataProvider } from "@/components/data-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Collection Tracker",
  description: "Track your trading card collection and its value",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${grotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-16 md:pb-0">
        <DataProvider>
          <AutoSync />
          <SiteHeader />
          <AssetSheetProvider>{children}</AssetSheetProvider>
          <SiteFooter />
          <BottomTabBar />
          <CardPreviewLayer />
        </DataProvider>
      </body>
    </html>
  );
}
