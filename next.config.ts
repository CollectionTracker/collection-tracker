import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Read in the browser by src/db, which seeds demo data in dev unless this is "0".
  env: { SEED_DEV_DATA: process.env.SEED_DEV_DATA ?? "" },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.tcgdex.net" },
      // Sealed product photos from TCGplayer (via TCGCSV).
      { protocol: "https", hostname: "tcgplayer-cdn.tcgplayer.com", pathname: "/product/**" },
      // Art stored before the move to TCGdex.
      { protocol: "https", hostname: "images.pokemontcg.io" },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
