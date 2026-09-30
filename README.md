# Reisen – Pläne, Karten & Checklisten

Statische Seite (ohne Build-Schritt) als Sammelstelle für alle Reisen:

- `/` – Übersicht aller Reisen (laufende und anstehende zuerst, mit Countdown)
- `/<reise>/` – je Reise: Tagesplan, Karte mit allen Tipps, Wetter und Checklisten
  (`/irland/`, `/florenz/`; Reiter über `#plan`, `#entdecken`, `#entdecken/<ort-id>`, `#infos`)

Läuft offline weiter (Service Worker) und lässt sich auf dem iPhone zum Homescreen hinzufügen.

## Neue Reise anlegen

1. `public/assets/trips/florenz.js` kopieren, z. B. nach `public/assets/trips/lissabon.js`, und `id` (= Adresse),
   Daten, Tage, Orte, Kategorien, Checklisten und Infos anpassen. `hotel: null` ist erlaubt, dann gilt `base`.
2. In `public/index.html` ein `<script src="/assets/trips/lissabon.js?v=…" defer>` ergänzen und die Datei in
   `public/sw.js` unter `PRECACHE` eintragen.
3. Icon unter `public/icons/` ablegen (SVG reicht) und optional ein Farbschema `[data-theme="lissabon"]` in
   `public/assets/app.css` anlegen (sonst grün wie Irland).

Nach Änderungen an Dateien in `public/assets/` den `?v=` in `index.html` und `sw.js` sowie `VERSION` in `sw.js` hochzählen.

## Lokal ansehen

```sh
npx wrangler dev                 # http://localhost:8787
node tools/smoke.js              # Playwright-Test: Übersicht + jede Reise mit allen Reitern
```

## Cloudflare

Ausgeliefert als Cloudflare Worker mit Static Assets (`wrangler.jsonc`, Ordner `public/`). Unbekannte Pfade wie
`/florenz/` liefern `index.html` aus (`not_found_handling: single-page-application`), die App wählt die Reise anhand der Adresse.
Einmalig im Cloudflare-Dashboard: **Workers & Pages → Create → Import a repository → `tbsxxl/irland`**,
Build-Befehl leer lassen, Deploy-Befehl `npx wrangler deploy`. Danach wird jeder Push auf `main` automatisch veröffentlicht.
