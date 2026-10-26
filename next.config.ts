import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.tcgdex.net" },
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
