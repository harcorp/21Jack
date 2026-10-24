import { serve } from "@hono/node-server";
import { createEngineApp } from "./app";
import { createDb } from "./db";

const port = Number(process.env.ENGINE_PORT ?? 3002);
const db = await createDb();
const app = createEngineApp(db);

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`engine listening on http://localhost:${port}`);
});

const shutdown = () => server.close(() => void db.close().finally(() => process.exit(0)));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
