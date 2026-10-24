// Renders every design board (.dc.html) to PNG so agents can compare against the source design.
import { chromium } from "playwright";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const root = "design/grand-hall-v3/design-canvas-local";
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith(".dc.html") && files.push(p); } };
walk(root);
const b = await chromium.launch({ channel: "chrome" });
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const f of files) {
  await page.goto("file://" + process.cwd() + "/" + f, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(400);
  const out = "design/grand-hall-v3/_renders/" + relative(root, f).replace(/\//g, "__").replace(".dc.html", ".png");
  await page.screenshot({ path: out, fullPage: true });
}
console.log("rendered", files.length);
await b.close();
