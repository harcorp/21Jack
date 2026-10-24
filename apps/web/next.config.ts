import type { NextConfig } from "next";

// Single .env at the repo root is shared by all apps.
try {
  process.loadEnvFile("../../.env");
} catch {}

const nextConfig: NextConfig = {
  transpilePackages: ["@21jack/contracts", "@21jack/game-ui"],
};

export default nextConfig;
