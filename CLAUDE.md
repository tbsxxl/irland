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
- Design: hell (kein Dunkelmodus), Apple-Stil – Systemschrift (SF Pro, sonst Inter), große Überschrift, iOS-Listen
  (`.list` > `.row`, farbige `.tile`), Segmented Control, Tab-Leiste unten auf dem Handy. Akzentfarbe je Reise über
  `[data-theme="<id>"], .t-<id>` in `app.css` (`--brand`, `--grad-a/b`). Keine Emojis in der Oberfläche.
- Icons: Lucide-Sprite `public/assets/icons.svg`, eingebunden per `ic("name")` in `app.js`. `icon:` in den Reisedaten
  sind Lucide-Namen. Neue Icons: `tools/build-icons.js` neu ausführen (Anleitung im Kopf der Datei).
  App-Icons der Reisen als SVG in `public/icons/` (Verlauf + weiße Linien), `reisen.svg` → PNGs fürs Manifest.
- Karte: CARTO Voyager mit API-Schlüssel (`CARTO_KEY` oben in `app.js`), Attribution OSM + CARTO muss sichtbar bleiben.
- Selbst gehostet: Schrift Inter, Leaflet 1.9.4 unter `assets/vendor/`. Extern nur Karten-Kacheln (CARTO),
  Wetter (Open-Meteo) und Fotos (Wikimedia) – bei neuen Quellen die CSP in `public/_headers` erweitern.
- Browser-Speicher pro Reise mit Präfix `<id>.`: `checks` (Checklisten), `favs` (gemerkte Orte), `wx` (letzte Wettervorhersage), `tab`.
- Während der Reise: Karte „Jetzt / Als Nächstes“ oben im Plan (`renderNow`, aktualisiert jede Minute).
- Leaflet wird erst beim Öffnen von „Entdecken“ nachgeladen (`ensureMap`).
- Kalender-Export (.ics) unter Infos: Uhrzeiten gelten als Ortszeit `tz` der Reise und werden in UTC umgerechnet.
- Routen/Suche öffnen auf Apple-Geräten Apple Karten, sonst Google Maps.
- Orte: optional `rating`/`reviews` (Tripadvisor, Stand angeben), `city` (andere Stadt als `center.name`, z. B. Rom-Tag – nur Liste, Kartensuche in dieser Stadt), `price`, `kind`, `free`.
- Fotos: Feld `wiki` (Titel der englischen Wikipedia, oder `de:`/`it:` + Titel) an Reise, Tag und Ort. `app.js` holt das
  Titelbild über die Wikipedia-REST-API (`/page/summary/`), lädt erst kurz vor Sichtbarkeit (IntersectionObserver),
  höchstens 4 gleichzeitig, merkt sich Ergebnisse 14 Tage in `localStorage` (`wiki:<titel>`). Kein Treffer → Platzhalter verschwindet.
  Tests bilden Wikipedia nach (Service Worker blockiert, sonst umgeht er die Mocks).
- Optionale Tagesfelder: `tip`, `alt` (Alternative), `ni` (Nordirland-Hinweis), `image` (feste Bilder in `IMAGES`), `wiki`.
- Bei Änderungen an Dateien unter `public/assets/`: `?v=` in `index.html` und `sw.js` sowie `VERSION` in `sw.js` hochzählen.
- Prüfen: `npx wrangler dev`, dann `node tools/smoke.js` (Playwright; externe Anfragen werden blockiert).
