// Lokaler Test: `npx wrangler dev` starten, dann `node tools/smoke.js [url] [ordner-für-screenshots]`.
// Öffnet alle Reiter auf Handy- und Desktopgröße, prüft JS-Fehler und fehlende Dateien.
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:8787/";
const SHOTS = process.argv[3];

(async () => {
  const browser = await chromium.launch();
  let failed = false;
  for (const [name, opts] of [
    ["mobil", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
    ["desktop", { viewport: { width: 1280, height: 900 } }],
    ["dunkel", { viewport: { width: 390, height: 844 }, colorScheme: "dark", isMobile: true }]
  ]) {
    const ctx = await browser.newContext({ ...opts, serviceWorkers: "block", locale: "de-DE" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push("JS: " + e.message));
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_/.test(m.text()) && errors.push("Konsole: " + m.text()));
    page.on("response", (r) => r.url().startsWith(BASE) && r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
    for (const tab of ["plan", "entdecken", "infos"]) {
      await page.goto(BASE + "#" + tab, { waitUntil: "load" });
      await page.waitForTimeout(400);
      if (!(await page.locator("#" + tab).isVisible())) errors.push(`Reiter ${tab} nicht sichtbar`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${tab}.png`, fullPage: tab !== "entdecken" });
    }
    // Entdecken: Filter, Suche, Karte
    await page.goto(BASE + "#entdecken", { waitUntil: "load" });
    const all = await page.locator(".place").count();
    await page.fill("#q", "whiskey"); await page.waitForTimeout(300);
    const whiskey = await page.locator(".place").count();
    const markers = await page.locator(".leaflet-interactive").count();
    if (!(all > 50 && whiskey > 0 && whiskey < all && markers > 0)) errors.push(`Filter/Karte: alle=${all} whiskey=${whiskey} marker=${markers}`);
    await page.goto(BASE + "#entdecken/teeling", { waitUntil: "load" }); await page.waitForTimeout(600);
    if (!(await page.locator(".leaflet-popup").isVisible())) errors.push("Popup für #entdecken/teeling fehlt");
    console.log(`${name}: ${errors.length ? "FEHLER\n  " + errors.join("\n  ") : "ok"} (Orte ${all}, Whiskey ${whiskey}, Marker ${markers})`);
    if (errors.length) failed = true;
    await ctx.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
