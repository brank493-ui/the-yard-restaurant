import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    turbopack: {
      root: __dirname,
    },
  },
};

export default nextConfig;
