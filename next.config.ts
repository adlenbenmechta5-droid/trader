import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Don't bundle these for serverless
  serverExternalPackages: ['pdf-parse', 'sharp'],
};

export default nextConfig;
