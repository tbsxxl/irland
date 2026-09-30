// Lokaler Test: `npx wrangler dev` starten, dann `node tools/smoke.js [url] [ordner-für-screenshots]`.
// Öffnet die Übersicht und jede Reise mit allen Reitern auf Handy- und Desktopgröße,
// prüft JS-Fehler und fehlende Dateien.
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
    // Übersicht
    await page.goto(BASE, { waitUntil: "load" });
    const cards = await page.locator(".trip-card").count();
    if (cards < 2) errors.push(`Übersicht: nur ${cards} Reisen`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-hub.png` });
    // Alte Irland-Links leiten weiter
    await page.goto(BASE + "#entdecken", { waitUntil: "load" }); await page.waitForTimeout(300);
    if (!page.url().includes("/irland/#entdecken")) errors.push("Weiterleitung alter Link fehlt: " + page.url());

    const trips = await page.evaluate(() => window.TRIPS.map((t) => ({ id: t.id, place: t.places.find((p) => p.lat)?.id })));
    const stats = [];
    for (const trip of trips) {
      const url = BASE + trip.id + "/";
      for (const tab of ["plan", "entdecken", "infos"]) {
        await page.goto(url + "#" + tab, { waitUntil: "load" });
        await page.waitForTimeout(400);
        if (!(await page.locator("#" + tab).isVisible())) errors.push(`${trip.id}: Reiter ${tab} nicht sichtbar`);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${trip.id}-${tab}.png`, fullPage: false });
      }
      await page.goto(url + "#entdecken", { waitUntil: "load" });
      const all = await page.locator(".place").count();
      const markers = await page.locator(".leaflet-interactive").count();
      await page.locator("#chips .chip").nth(1).click(); await page.waitForTimeout(200);
      const filtered = await page.locator(".place").count();
      if (!(all > 20 && filtered > 0 && filtered < all && markers > 10)) errors.push(`${trip.id}: Filter/Karte alle=${all} gefiltert=${filtered} marker=${markers}`);
      await page.goto(url + "#entdecken/" + trip.place, { waitUntil: "load" }); await page.waitForTimeout(600);
      if (!(await page.locator(".leaflet-popup").isVisible())) errors.push(`${trip.id}: Popup für ${trip.place} fehlt`);
      stats.push(`${trip.id} ${all} Orte`);
    }
    console.log(`${name}: ${errors.length ? "FEHLER\n  " + errors.join("\n  ") : "ok"} (${stats.join(", ")})`);
    if (errors.length) failed = true;
    await ctx.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
