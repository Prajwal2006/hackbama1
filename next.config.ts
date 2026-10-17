import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every app route is per-viewer (session cookie + live auction state), so we
  // use the request-time model rather than Cache Components for now.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Listing photos are resized client-side (~300 KB each, max 4).
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
