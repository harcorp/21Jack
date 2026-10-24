import { callService } from "@/lib/services";

export async function GET() {
  const check = async (service: "game" | "engine") => {
    try {
      return (await callService(service, "/health")).ok;
    } catch {
      return false;
    }
  };
  const [game, engine] = await Promise.all([check("game"), check("engine")]);
  return Response.json({ web: true, game, engine });
}
