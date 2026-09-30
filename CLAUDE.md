# Irland-Reiseplan

Statische Seite in `public/`, gehostet als Cloudflare Worker (Static Assets, `wrangler.jsonc`), kein Build-Schritt,
keine npm-Abhängigkeiten. Cloudflare baut jeden Push auf `main` automatisch.

- Inhalte nur in `public/assets/data.js`; `app.js` rendert Plan, Entdecken (Leaflet-Karte + Liste) und Infos.
- Reiter über die Adresse: `#plan`, `#entdecken`, `#entdecken/<ort-id>` (Karte mit Popup), `#infos`, `#tag-3`.
- Selbst gehostet: Schriften (Inter, Fraunces), Leaflet 1.9.4 unter `assets/vendor/`. Extern nur Karten-Kacheln (CARTO),
  Wetter (Open-Meteo) und Fotos (Wikimedia) – bei neuen Quellen die CSP in `public/_headers` erweitern.
- Browser-Speicher: `irland.checks` (Checklisten), `irland.wx` (letzte Wettervorhersage), `irland.tab`.
- Bei Änderungen an Dateien unter `public/assets/`: `?v=` in `index.html` und `sw.js` sowie `VERSION` in `sw.js` hochzählen.
- Prüfen: `npx wrangler dev`, dann `node tools/smoke.js` (Playwright; externe Anfragen werden blockiert).
