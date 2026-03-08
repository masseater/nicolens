import type { NextConfig } from "next";

const SECONDS_PER_HOUR = 3600;
const THUMBNAIL_CACHE_HOURS = 24;

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nicovideo.cdn.nimg.jp",
        pathname: "/thumbnails/**",
      },
    ],
    minimumCacheTTL: THUMBNAIL_CACHE_HOURS * SECONDS_PER_HOUR,
  },
};

// oxlint-disable-next-line import/no-default-export -- Next.js requires default export for config
export default nextConfig;
