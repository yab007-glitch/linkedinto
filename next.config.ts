import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize packages that use Node.js features incompatible with bundlers
  serverExternalPackages: ['bull', 'ioredis'],
};

export default nextConfig;
