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
    ["tablet", { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true }]
  ]) {
    const ctx = await browser.newContext({ ...opts, serviceWorkers: "block", locale: "de-DE" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push("JS: " + e.message));
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_/.test(m.text()) && errors.push("Konsole: " + m.text()));
    page.on("response", (r) => r.url().startsWith(BASE) && r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
    // Wikipedia/Wikimedia nachgebildet (aus der Testumgebung nicht erreichbar)
    const png = require("fs").readFileSync(require("path").join(__dirname, "../public/icons/hub-192.png"));
    await page.route(/wikipedia\.org\/api\/rest_v1\/page\/summary\//, (r) => r.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ thumbnail: { source: "https://upload.wikimedia.org/x/320px-a.png" }, originalimage: { source: "https://upload.wikimedia.org/x/a.png", width: 800 }, content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/X" } } }) }));
    await page.route(/upload\.wikimedia\.org/, (r) => r.fulfill({ contentType: "image/png", body: png }));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1|upload\.wikimedia|[a-z]{2}\.wikipedia)/, (r) => r.abort());
    // Übersicht
    await page.goto(BASE, { waitUntil: "load" });
    const cards = await page.locator(".trip-card").count();
    if (cards < 2) errors.push(`Übersicht: nur ${cards} Reisen`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-hub.png` });
    // Inspiration: Reiter, Filter, Detailblatt
    const inspoCards = () => page.locator(".inspo-card").count();
    const filter = async (sel) => { await page.click("#inspoFilterBtn"); await page.waitForTimeout(300); await page.click("#sheet " + sel); await page.click("#fShow"); await page.waitForTimeout(350); };
    await page.goto(BASE + "#inspiration", { waitUntil: "load" }); await page.waitForTimeout(400);
    const dest = await inspoCards();
    await filter('[data-ft="warm"]');
    const warm = await inspoCards();
    if (!(dest > 100 && warm > 5 && warm < dest)) errors.push(`Inspiration: ${dest} Ziele, ${warm} warm`);
    if ((await page.locator("#inspoFilterBtn .badge").textContent()) !== "1") errors.push("Filter-Zähler fehlt");
    await page.click('#inspoActive [data-clear="warm"]'); await page.waitForTimeout(200);
    if ((await inspoCards()) !== dest) errors.push("Filter-Chip entfernt den Filter nicht");
    await page.locator(".inspo-card").first().click(); await page.waitForTimeout(400);
    if ((await page.locator("#sheet .week li").count()) !== 7) errors.push("Inspiration: Wochenplan im Detailblatt fehlt");
    if (!(await page.locator("#sheet [data-share-inspo]").count())) errors.push("Teilen-Knopf fehlt");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    // Reisemonat: Juli wählen, nur Tipps zeigen → genau die Juli-Tipps, Blatt mit Tipp, Kosten und Klima
    await page.click("#inspoMonthBtn"); await page.waitForTimeout(300);
    await page.click('#sheet [data-month-pick="6"]'); await page.waitForTimeout(350);
    await filter('[data-ft="tip"]');
    const julTips = await page.evaluate(() => Object.keys(window.INSPIRATION_MONTHS[7]).length);
    const julCards = await inspoCards();
    if (julCards !== julTips || (await page.locator(".inspo-card .inspo-tip").count()) !== julTips) errors.push(`Monatstipps Juli: ${julCards} Karten statt ${julTips}`);
    await page.locator(".inspo-card").first().click(); await page.waitForTimeout(400);
    if ((await page.locator("#sheet .inspo-notice.tip").count()) !== 1) errors.push("Monatstipp im Detailblatt fehlt");
    if ((await page.locator("#sheet .cost-sum .row").count()) < 3) errors.push("Kosten im Detailblatt fehlen");
    if ((await page.locator("#sheet .clim-m").count()) !== 12) errors.push("Klima-Diagramm fehlt");
    await page.locator('#sheet [data-clim="0"]').click(); await page.waitForTimeout(200);
    if ((await page.locator("#inspoMonthBtn span").textContent()) !== "Januar" || !(await page.locator('#sheet [data-clim="0"]').getAttribute("class")).includes("on"))
      errors.push("Monat im Klima-Diagramm wechselt den Reisemonat nicht");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-inspo-sheet.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    await page.click('#inspoActive [data-clear="tip"]'); await page.waitForTimeout(200);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-inspo.png` });
    // Fernreisen und Budget
    await filter('[data-f="dist"] [data-v="far"]');
    const far = await inspoCards();
    if (far < 15 || far > 40) errors.push(`Fernreisen: ${far} Ziele`);
    await page.click('#inspoActive [data-clear="dist"]'); await page.waitForTimeout(200);
    await page.click("#inspoFilterBtn"); await page.waitForTimeout(300);
    await page.evaluate(() => { const r = document.querySelector("#fBudget"); r.value = "1500"; r.dispatchEvent(new Event("input", { bubbles: true })); });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-inspo-filter.png` });
    await page.click("#fShow"); await page.waitForTimeout(300);
    const cheap = await inspoCards();
    const tooExpensive = await page.evaluate(() => [...document.querySelectorAll(".inspo-price")].filter((e) => parseInt(e.textContent.replace(/\D/g, ""), 10) > 1500).length);
    if (!(cheap > 3 && cheap < dest) || tooExpensive) errors.push(`Budget-Filter: ${cheap} Ziele, ${tooExpensive} zu teuer`);
    await page.click('#inspoActive [data-clear="budget"]'); await page.waitForTimeout(200);
    // Zwei Ziele merken und vergleichen
    await page.locator(".inspo-card .inspo-fav").nth(0).click(); await page.locator(".inspo-card .inspo-fav").nth(1).click(); await page.waitForTimeout(200);
    await page.click("#inspoActive [data-compare]"); await page.waitForTimeout(400);
    if ((await page.locator("#sheet .cmp thead th").count()) !== 3) errors.push("Vergleich zeigt nicht zwei Ziele");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-inspo-cmp.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    // Reisende ändern: Preise rechnen mit 3 Personen, im Blatt Gesamtsumme
    const price2 = await page.locator(".inspo-card .inspo-price").first().textContent();
    await page.click("#inspoGroupBtn"); await page.waitForTimeout(300);
    await page.click('#sheet [data-step="pax"][data-d="1"]'); await page.waitForTimeout(200);
    await page.click("#sheet [data-spend]"); await page.waitForTimeout(200);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-inspo-group.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const price3 = await page.locator(".inspo-card .inspo-price").first().textContent();
    if (price2 === price3 || !(await page.locator("#inspoCount").textContent()).includes("3 Personen")) errors.push(`Reisende: Preis ändert sich nicht (${price2} / ${price3})`);
    await page.locator(".inspo-card").first().click(); await page.waitForTimeout(400);
    await page.locator("#costBox").scrollIntoViewIfNeeded();
    if (!(await page.locator("#costBox .row.total").count())) errors.push("Kostenrechner im Detailblatt fehlt");
    await page.click('#costBox [data-step="nights"][data-d="1"]'); await page.waitForTimeout(200);
    if (!(await page.locator("#costBox").textContent()).includes("8 Nächte")) errors.push("Nächte im Kostenrechner ändern sich nicht");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-inspo-cost.png` });
    await page.click('#costBox [data-step="nights"][data-d="-1"]'); await page.click('#costBox [data-step="pax"][data-d="-1"]'); await page.click("#costBox [data-spend]");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    // Gemerkte Ideen auf der Übersicht
    await page.click('#hubTabs [data-hubtab="reisen"]'); await page.waitForTimeout(200);
    if ((await page.locator("#hubList .idea").count()) !== 2) errors.push("Gemerkte Ideen fehlen auf der Übersicht");
    await page.click('#hubTabs [data-hubtab="inspiration"]'); await page.waitForTimeout(200);
    // Weltkarte
    await page.click('#inspoView [data-view="map"]'); await page.waitForTimeout(1200);
    const pins = await page.locator(".wpin").count();
    if (pins !== dest) errors.push(`Weltkarte: ${pins} Marker statt ${dest}`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-inspo-map.png` });
    await page.locator(".wpin").first().click({ force: true }); await page.waitForTimeout(400);
    if (!(await page.locator("#sheet .clim").isVisible())) errors.push("Marker auf der Weltkarte öffnet kein Ziel");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    await page.click('#inspoView [data-view="list"]'); await page.waitForTimeout(200);
    // Aus einem Ziel eine Reise machen, Buchung eintragen, wieder löschen
    await page.goto(BASE + "#inspiration/bali", { waitUntil: "load" }); await page.waitForTimeout(500);
    await page.click("#sheet [data-plan]"); await page.waitForTimeout(300);
    await page.fill("#planStart", "2027-07-03");
    await Promise.all([page.waitForNavigation(), page.click("#sheet [data-plan-create]")]);
    await page.waitForTimeout(500);
    if (!page.url().includes("/x-bali-2027-07-03/") || (await page.locator("#title").textContent()) !== "Bali") errors.push("Eigene Reise: Seite fehlt " + page.url());
    if ((await page.locator("#days .day").count()) !== 8) errors.push("Eigene Reise: nicht 8 Tage");
    await page.goto(page.url().split("#")[0] + "#infos", { waitUntil: "load" }); await page.waitForTimeout(300);
    await page.click('#bookings [data-booking="new"]'); await page.waitForTimeout(300);
    await page.fill("#bkTitle", "QR 81 Frankfurt → Denpasar"); await page.fill("#bkDate", "2027-07-03"); await page.fill("#bkTime", "10:40"); await page.fill("#bkRef", "ABC123");
    await page.click("#sheet [data-bk-save]"); await page.waitForTimeout(400);
    if ((await page.locator("#bookings .row").count()) !== 2) errors.push("Buchung wird nicht gespeichert");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-mytrip-infos.png` });
    await page.click("#tab-plan"); await page.waitForTimeout(300);
    if (!(await page.locator("#tag-1 .stop.is-booking").count())) errors.push("Buchung fehlt im Tagesplan");
    page.once("dialog", (d) => d.accept());
    await page.click("#tab-infos"); await page.waitForTimeout(200);
    await Promise.all([page.waitForNavigation(), page.click('[data-act="delete"]')]);
    if ((await page.evaluate(() => (JSON.parse(localStorage.getItem("mytrips")) || []).length)) !== 0) errors.push("Eigene Reise wird nicht gelöscht");
    // Daten: jedes Ziel mit 12 Temperaturen und Preisen, Monatstipps nur für vorhandene Ziele
    const bad = await page.evaluate(() => {
      const ids = new Set(window.INSPIRATION.map((d) => d.id));
      return [...window.INSPIRATION.filter((d) => d.temps?.length !== 12 || d.hotel?.length !== 2 || d.fly?.length !== 2 || d.hotel[0] > d.hotel[1] || d.fly[0] > d.fly[1]).map((d) => d.id),
        ...Object.values(window.INSPIRATION_MONTHS).flatMap((o) => Object.keys(o)).filter((id) => !ids.has(id))];
    });
    if (bad.length) errors.push("Inspiration-Daten unvollständig: " + bad.join(", "));
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
        if (tab === "plan") {
          // Tagesroute auf der Karte: nummerierte Stopps und Fußweg (Routing-Dienst gemockt)
          await page.route("https://routing.openstreetmap.de/**", (r) => {
            const pts = decodeURIComponent(new URL(r.request().url()).pathname.split("/").pop()).split(";").map((x) => x.split(",").map(Number));
            r.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
              body: JSON.stringify({ routes: [{ distance: 2345, duration: 1800, geometry: { type: "LineString", coordinates: pts } }] }) });
          });
          const b = page.locator("[data-daymap]").first();
          const idx = await b.getAttribute("data-daymap");
          await b.scrollIntoViewIfNeeded(); await b.click(); await page.waitForTimeout(1200);
          const nums = await page.locator(`#daymap-${idx} .pin-num`).count();
          const info = await page.locator(`[data-routeinfo="${idx}"]`).textContent();
          if (nums < 2 || !/30 Min\. zu Fuß/.test(info)) errors.push(`${trip.id}: Tagesroute auf der Karte fehlt (${nums} Stopps, „${info}“)`);
          if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${trip.id}-daymap.png` });
          await b.click(); await page.waitForTimeout(200);
          if (!(await page.locator(`#daymap-${idx}`).isHidden())) errors.push(`${trip.id}: Tageskarte schließt nicht`);
        }
        if (tab === "plan" && !(await page.locator(".day-route a").count() && await page.locator(".leg").count() && await page.locator(".rainbox").count()))
          errors.push(`${trip.id}: Route des Tages, Fußwege oder Regen-Ideen fehlen`);
        if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${trip.id}-${tab}.png`, fullPage: false });
      }
      await page.goto(url + "#entdecken", { waitUntil: "load" });
      const all = await page.locator(".place").count();
      const markers = await page.locator(".leaflet-interactive").count();
      await page.locator("#chips .chip[data-cat]").nth(1).click(); await page.waitForTimeout(200);
      const filtered = await page.locator(".place").count();
      if (!(all > 20 && filtered > 0 && filtered < all && markers > 10)) errors.push(`${trip.id}: Filter/Karte alle=${all} gefiltert=${filtered} marker=${markers}`);
      await page.goto(url + "#entdecken/" + trip.place, { waitUntil: "load" }); await page.waitForTimeout(600);
      if (!(await page.locator(".leaflet-tooltip").first().isVisible())) errors.push(`${trip.id}: Marker für ${trip.place} nicht hervorgehoben`);
      // Detailblatt: Ort antippen öffnet es, Escape schließt es
      await page.locator(".place").first().click(); await page.waitForTimeout(400);
      if (!(await page.locator("#sheet .sheet-content h2").isVisible())) errors.push(`${trip.id}: Detailblatt öffnet nicht`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      if (await page.locator("#sheet").isVisible()) errors.push(`${trip.id}: Detailblatt schließt nicht`);
      // Merken + Filter „Gemerkt“
      await page.goto(url + "#entdecken", { waitUntil: "load" });
      await page.locator(".fav").first().click();
      await page.locator(".chip-fav").click(); await page.waitForTimeout(150);
      if ((await page.locator(".place").count()) !== 1) errors.push(`${trip.id}: Filter „Gemerkt“ zeigt nicht genau 1 Ort`);
      // Kalender-Export
      await page.goto(url + "#infos", { waitUntil: "load" });
      const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }).catch(() => null), page.click('[data-act="ics"]')]);
      if (!dl) errors.push(`${trip.id}: kein Kalender-Download`);
      else {
        const ics = require("fs").readFileSync(await dl.path(), "utf8");
        if (!/BEGIN:VEVENT/.test(ics) || !/END:VCALENDAR/.test(ics)) errors.push(`${trip.id}: Kalenderdatei unvollständig`);
      }
      // Fotos in der Liste und auf den Tageskarten
      await page.goto(url + "#entdecken", { waitUntil: "load" }); await page.waitForTimeout(800);
      const photos = await page.locator(".ph.is-loaded").count();
      if (!photos) errors.push(`${trip.id}: keine Fotos in der Liste`);
      await page.goto(url + "#plan", { waitUntil: "load" }); await page.waitForTimeout(800);
      const dayPhotos = await page.locator(".day-img.is-loaded").count();
      if (!dayPhotos) errors.push(`${trip.id}: keine Tagesfotos`);
      // Datenprüfung: Orte der Programmpunkte und Kategorien existieren
      const bad = await page.evaluate((id) => {
        const t = window.TRIPS.find((x) => x.id === id), ids = new Set(t.places.map((p) => p.id)), out = [];
        if (ids.size !== t.places.length) out.push("doppelte Orts-IDs");
        t.days.forEach((d) => [...d.stops, ...(d.extras || [])].forEach((s) => s.place && !ids.has(s.place) && out.push("fehlender Ort " + s.place)));
        t.places.forEach((p) => p.cats.forEach((c) => !t.cats[c] && out.push(`unbekannte Kategorie ${c} bei ${p.id}`)));
        return out;
      }, trip.id);
      errors.push(...bad.map((b) => `${trip.id}: ${b}`));
      stats.push(`${trip.id} ${all} Orte, ${photos} Fotos sichtbar`);
    }
    // Während der Reise: „Jetzt / Als Nächstes“ (Uhr auf Florenz, Do 12.11. 10:00 gestellt)
    const ctx2 = await browser.newContext({ ...opts, serviceWorkers: "block" });
    await ctx2.clock.setFixedTime(new Date(2026, 10, 12, 10, 0));
    const p2 = await ctx2.newPage();
    await p2.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.abort());
    await p2.goto(BASE + "florenz/#plan", { waitUntil: "load" });
    const nowText = await p2.locator("#nowBox").innerText().catch(() => "");
    if (!/Jetzt/.test(nowText) || !/Als Nächstes/.test(nowText)) errors.push("Jetzt-Karte fehlt: " + nowText.slice(0, 80));
    if (SHOTS) await p2.screenshot({ path: `${SHOTS}/${name}-florenz-unterwegs.png` });
    await ctx2.close();

    console.log(`${name}: ${errors.length ? "FEHLER\n  " + errors.join("\n  ") : "ok"} (${stats.join(", ")})`);
    if (errors.length) failed = true;
    await ctx.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
