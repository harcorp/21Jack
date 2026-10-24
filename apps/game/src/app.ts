import { Hono } from "hono";
import { apiError, SERVICE_KEY_HEADER } from "@21jack/contracts";

/** Owner: P1 (Game Logic). */
export const app = new Hono();

app.get("/health", (c) => c.json({ service: "game", ok: true }));

// Only trusted services (web, game) may call this API.
app.use("*", async (c, next) => {
  if (c.req.header(SERVICE_KEY_HEADER) !== process.env.SERVICE_KEY) {
    return c.json(apiError("UNAUTHORIZED", "Missing or invalid service key"), 401);
  }
  await next();
});
