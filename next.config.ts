import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js"],
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
