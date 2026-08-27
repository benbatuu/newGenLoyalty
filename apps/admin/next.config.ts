import type { NextConfig } from "next";

/**
 * Vercel: set API_URL (no NEXT_PUBLIC_ required).
 * Exposed to the client at build time via env mapping.
 */
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "",
  },
};

export default nextConfig;
