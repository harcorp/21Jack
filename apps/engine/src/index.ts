import { serve } from "@hono/node-server";
import { app } from "./app";

const port = Number(process.env.ENGINE_PORT ?? 3002);

serve({ fetch: app.fetch, port }, () => {
  console.log(`engine listening on http://localhost:${port}`);
});
