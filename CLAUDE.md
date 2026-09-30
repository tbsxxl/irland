# Reisen (Repo `irland`)

Statische Seite in `public/`, gehostet als Cloudflare Worker (Static Assets, `wrangler.jsonc`, Name `irland`), kein Build-Schritt,
keine npm-Abhängigkeiten. Cloudflare baut jeden Push auf `main` automatisch.

- Sammelstelle für alle Reisen: `/` = Übersicht, `/<id>/` = Reise. Eine Seite (`index.html` + `assets/app.js`) für alles;
  unbekannte Pfade liefert Cloudflare als `index.html` aus (SPA-Modus), `app.js` wählt die Reise über den Pfad.
- Jede Reise ist eine Datei `public/assets/trips/<id>.js`, die sich in `window.TRIPS` einträgt (Aufbau wie `florenz.js`).
  Neue Reise: Datei + `<script>` in `index.html` + Eintrag in `sw.js` (`PRECACHE`) + Icon in `public/icons/`,
  optional Farbschema `[data-theme="<id>"]` in `app.css`.
- Alte Links `/#entdecken` usw. leiten nach `/irland/#…` weiter.
- Reiter über die Adresse: `#plan`, `#entdecken`, `#entdecken/<ort-id>`, `#infos`, `#tag-3`.
- Florenz ist ein Entwurf: `hotel: null`, Entfernungen ab `base` (Dom); Flugzeiten fehlen noch.
- Selbst gehostet: Schriften (Inter, Fraunces), Leaflet 1.9.4 unter `assets/vendor/`. Extern nur Karten-Kacheln (CARTO),
  Wetter (Open-Meteo) und Fotos (Wikimedia) – bei neuen Quellen die CSP in `public/_headers` erweitern.
- Browser-Speicher pro Reise mit Präfix `<id>.`: `checks` (Checklisten), `wx` (letzte Wettervorhersage), `tab`.
- Bei Änderungen an Dateien unter `public/assets/`: `?v=` in `index.html` und `sw.js` sowie `VERSION` in `sw.js` hochzählen.
- Prüfen: `npx wrangler dev`, dann `node tools/smoke.js` (Playwright; externe Anfragen werden blockiert).
