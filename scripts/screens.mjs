/**
 * Plays the full journey in Chrome with Playwright and saves screenshots to .screens/.
 * Requires `pnpm dev` running. Usage: pnpm screens [desktop|mobile]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = "http://localhost:3000";
const mobile = process.argv[2] === "mobile";
const out = ".screens";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext(
  mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 } },
);
await context.addInitScript(() => window.localStorage.setItem("21jack.coach", "1"));
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));

const tag = mobile ? "mobile" : "desktop";
let n = 0;
async function shot(name) {
  await page.waitForTimeout(1500);
  const file = `${out}/${tag}-${String(++n).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log("saved", file);
}

await page.goto(base);
await page.locator("input").first().fill(`knight_${Date.now().toString(36).slice(-5)}`);
await page.locator("form button").first().click();
await page.waitForLoadState("networkidle");
await shot("lobby");

await page.goto(`${base}/wallet`);
await page.getByRole("button", { name: /500/ }).first().click();
await page.waitForTimeout(800);

await page.goto(`${base}/play`);
await page.waitForLoadState("networkidle");
await shot("betting");

await page.getByRole("button", { name: /Add 25/ }).first().click();
await page.getByRole("button", { name: /^deal/i }).first().click();
await shot("dealt");

// Play the opposite of the first advice to see Claudalf's feedback, then follow his advice.
let first = true;
for (let i = 0; i < 8; i++) {
  const stand = page.getByRole("button", { name: /^stand/i }).first();
  if (!(await stand.isVisible().catch(() => false)) || !(await stand.isEnabled().catch(() => false))) break;
  const recommended = page.getByRole("button", { name: /Claudalf recommends/ }).first();
  const advice = (await recommended.isVisible().catch(() => false)) ? await recommended.innerText() : "";
  const target = first ? (/hit/i.test(advice) ? "stand" : "hit") : advice.split(/\s/)[0]?.toLowerCase() || "stand";
  await page.getByRole("button", { name: new RegExp(`^${target}`, "i") }).first().click();
  first = false;
  await shot(`after-${target}`);
}
await page.waitForTimeout(2500);
await shot("settled");

await page.goto(`${base}/history`);
await shot("history");
if (!mobile) {
  await page.goto(`${base}/dev/table`);
  await shot("dev-table");
}
await browser.close();
