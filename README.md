# Dublin & Nordirland – Reiseplan

Statische Seite (ohne Build-Schritt) mit Tagesplan, Karte aller Tipps, Wetter und Checklisten.
Läuft offline weiter (Service Worker) und lässt sich auf dem iPhone zum Homescreen hinzufügen.

## Inhalte ändern

Alles Inhaltliche steht in `public/assets/data.js`: Reisedaten, Tagesplan (`DAYS`), Orte mit Koordinaten (`PLACES`),
Kategorien, Checklisten und Infos. Nach Änderungen an Dateien in `public/assets/` den `?v=` in `index.html`
und in `public/sw.js` (`PRECACHE`) sowie `VERSION` in `sw.js` hochzählen.

## Lokal ansehen

```sh
npx wrangler dev                 # http://localhost:8787
node tools/smoke.js              # Playwright-Test aller Reiter (braucht playwright)
```

## Cloudflare

Ausgeliefert als Cloudflare Worker mit Static Assets (`wrangler.jsonc`, Ordner `public/`).
Einmalig im Cloudflare-Dashboard: **Workers & Pages → Create → Import a repository → `tbsxxl/irland`**,
Build-Befehl leer lassen, Deploy-Befehl `npx wrangler deploy`. Danach wird jeder Push auf `main` automatisch veröffentlicht
(Adresse: `https://irland.<konto>.workers.dev`).
