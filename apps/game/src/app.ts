import { Hono, type Context } from "hono";
import { z } from "zod";
import { ActionRequest, apiError, SERVICE_KEY_HEADER, StartRoundRequest, Uuid } from "@21jack/contracts";
import { EngineUnavailableError, GameError } from "./errors";
import { createGameService, type GameDeps } from "./service";

/** Owner: P1 (Game Logic). */
export function createGameApp(deps: GameDeps & { serviceKey: string }) {
  const service = createGameService(deps);
  const app = new Hono();

  app.get("/health", (c) => c.json({ service: "game", ok: true }));

  // Only trusted services (web) may call this API.
  app.use("*", async (c, next) => {
    if (!deps.serviceKey || c.req.header(SERVICE_KEY_HEADER) !== deps.serviceKey) {
      return c.json(apiError("UNAUTHORIZED", "Missing or invalid service key"), 401);
    }
    await next();
  });

  async function body<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
    const json: unknown = await c.req.json().catch(() => undefined);
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new GameError("VALIDATION_ERROR", z.prettifyError(parsed.error));
    return parsed.data;
  }
  const roundIdParam = (c: Context): string => {
    const id = c.req.param("id");
    if (!Uuid.safeParse(id).success) throw new GameError("NOT_FOUND", "Round not found");
    return id!;
  };

  app.post("/rounds", async (c) => c.json(await service.start(await body(c, StartRoundRequest))));

  app.get("/rounds/active", async (c) => {
    const accountId = Uuid.safeParse(c.req.query("accountId"));
    if (!accountId.success) throw new GameError("VALIDATION_ERROR", "accountId query parameter must be a UUID");
    return c.json(await service.active(accountId.data));
  });

  app.get("/boss", async (c) => {
    const accountId = Uuid.safeParse(c.req.query("accountId"));
    if (!accountId.success) throw new GameError("VALIDATION_ERROR", "accountId query parameter must be a UUID");
    return c.json(await service.boss(accountId.data));
  });

  app.get("/rounds/:id", async (c) => c.json(await service.get(roundIdParam(c))));

  app.post("/rounds/:id/actions", async (c) => {
    const id = roundIdParam(c);
    return c.json(await service.act(id, await body(c, ActionRequest)));
  });

  app.notFound((c) => c.json(apiError("NOT_FOUND", "Route not found"), 404));

  app.onError((err, c) => {
    if (err instanceof GameError) return c.json(apiError(err.code, err.message), err.status as 400);
    console.error(err);
    // Safe to retry with the same requestId/actionId.
    if (err instanceof EngineUnavailableError) {
      return c.json(apiError("SERVICE_UNAVAILABLE", "Casino engine unavailable, try again"), 503);
    }
    return c.json(apiError("INTERNAL", "Unexpected game error"), 500);
  });

  return app;
}
