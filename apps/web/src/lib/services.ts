import "server-only";
import { SERVICE_KEY_HEADER } from "@21jack/contracts";

const urls = {
  game: process.env.GAME_URL ?? "http://127.0.0.1:3001",
  engine: process.env.ENGINE_URL ?? "http://127.0.0.1:3002",
};

/** Server-side call to the game or engine service. The service key never reaches the browser. */
export function callService(service: keyof typeof urls, path: string, init: RequestInit = {}) {
  return fetch(`${urls[service]}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      [SERVICE_KEY_HEADER]: process.env.SERVICE_KEY ?? "",
      ...init.headers,
    },
  });
}
