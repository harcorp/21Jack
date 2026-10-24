/**
 * Serves the casino to other devices on the same network: prints the URL to share, then runs `pnpm dev`.
 * Only the website (:3000) is reachable from the network; game and engine stay on 127.0.0.1.
 */
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

const port = process.env.WEB_PORT ?? "3000";
const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4" && !net.internal)
  .map((net) => net.address);

if (addresses.length === 0) {
  console.log("No network connection found: connect to Wi-Fi to share the casino.");
} else {
  console.log("\n  21Jack is open to your network. Share one of these URLs (same Wi-Fi):\n");
  for (const address of addresses) console.log(`    http://${address}:${port}`);
  console.log("\n  Each player creates their own account. If macOS asks, allow incoming connections for node.\n");
}

const dev = spawn("pnpm", ["dev"], { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => dev.kill(signal));
dev.on("exit", (code) => process.exit(code ?? 0));
