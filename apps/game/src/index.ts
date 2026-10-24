import { serve } from "@hono/node-server";
import { createGameApp } from "./app";
import { createEngineFromEnv } from "./engine";
import { createStoreFromEnv } from "./store";

const port = Number(process.env.GAME_PORT ?? 3001);
const serviceKey = process.env.SERVICE_KEY ?? "";
if (!serviceKey) console.warn("SERVICE_KEY is not set: every request will be rejected");

const store = await createStoreFromEnv(process.env);
const engine = createEngineFromEnv(process.env, serviceKey);
const app = createGameApp({ engine, store, serviceKey });

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`game listening on http://localhost:${port} (engine: ${process.env.ENGINE_MODE ?? "real"})`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close();
    void store.close().finally(() => process.exit(0));
  });
}
