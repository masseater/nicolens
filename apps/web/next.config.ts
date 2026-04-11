import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

// oxlint-disable-next-line import/no-default-export -- Next.js requires default export for config
export default nextConfig;
