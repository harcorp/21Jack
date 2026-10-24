import { serve } from "@hono/node-server";
import { createEngineApp } from "./app";
import { createDb } from "./db";

const port = Number(process.env.ENGINE_PORT ?? 3002);
const db = await createDb();
const app = createEngineApp(db);

// Internal service: only apps/web (same machine) may reach it, never other devices on the network.
const server = serve({ fetch: app.fetch, port, hostname: process.env.HOST ?? "127.0.0.1" }, () => {
  console.log(`engine listening on http://127.0.0.1:${port}`);
});

const shutdown = () => server.close(() => void db.close().finally(() => process.exit(0)));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
