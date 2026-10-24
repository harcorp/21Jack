import { serve } from "@hono/node-server";
import { app } from "./app";

const port = Number(process.env.GAME_PORT ?? 3001);

serve({ fetch: app.fetch, port }, () => {
  console.log(`game listening on http://localhost:${port}`);
});
