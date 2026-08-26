import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep CI and small production builders stable instead of spawning one
  // prerender worker per detected CPU core.
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
