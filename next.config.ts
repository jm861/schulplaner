import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for mobile builds (Capacitor)
  output: process.env.MOBILE_BUILD === 'true' ? 'export' : undefined,
};

export default nextConfig;
