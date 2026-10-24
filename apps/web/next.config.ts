import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// Single .env at the repo root is shared by all apps.
try {
  process.loadEnvFile("../../.env");
} catch {}

// Let other devices on the same network use the dev server (pnpm lan), e.g. http://10.0.0.41:3000.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4" && !net.internal)
  .map((net) => net!.address);

const nextConfig: NextConfig = {
  transpilePackages: ["@21jack/contracts", "@21jack/game-ui"],
  allowedDevOrigins: [...lanAddresses, "*.local"],
};

export default nextConfig;
