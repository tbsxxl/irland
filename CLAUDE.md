# Reisen (Repo `irland`)

Statische Seite in `public/`, gehostet als Cloudflare Worker (Static Assets, `wrangler.jsonc`, Name `irland`), kein Build-Schritt,
keine npm-Abhängigkeiten. Cloudflare baut jeden Push auf `main` automatisch.

- Sammelstelle für alle Reisen: `/` = Übersicht, `/<id>/` = Reise. Eine Seite (`index.html` + `assets/app.js`) für alles;
  unbekannte Pfade liefert Cloudflare als `index.html` aus (SPA-Modus), `app.js` wählt die Reise über den Pfad.
- Jede Reise ist eine Datei `public/assets/trips/<id>.js`, die sich in `window.TRIPS` einträgt (Aufbau wie `florenz.js`).
  Neue Reise: Datei + `<script>` in `index.html` + Eintrag in `sw.js` (`PRECACHE`) + Icon in `public/icons/`,
  optional Farbschema `[data-theme="<id>"]` in `app.css`.
- Startseite hat zwei Reiter: „Meine Reisen“ und „Inspiration“ (`#inspiration`, `#inspiration/<id>` öffnet ein Ziel).
  Ziele stehen in `public/assets/inspiration.js` (`temps` = 12 Monats-Höchstwerte, `hotel`/`fly` = Preisspannen in €,
  Flugzeit (ab 7 Std. = „Fernreise“), `rain` = Regenzeit-Monate, Tags, Highlights, Wochenplan, `wiki` fürs Foto,
  `off` = Nebensaison-Hinweis, gezeigt in `offMonths` (Standard Nov–März; Südhalbkugel eigene Monate)).
  Tag `bucket` = Bucket List (Fahne an der Karte, Schnellwahl-Chip in der Leiste).
  `INSPIRATION_MONTHS` (unten in derselben Datei) = Tipps pro Monat mit Grund; Reihenfolge = Rang bei „Empfohlen“.
  `ll` = Koordinaten für die Weltkarte (Ansicht „Weltkarte“, Marker = Temperatur im Monat, weit draußen nur Punkte).
  Bedienung: Leiste mit Monat (Blatt), Suche, Filter-Knopf (Blatt: Sortierung, Flugzeit, Budget „Woche zu zweit“, Tipps,
  Gemerkt, Warm, ohne Regenzeit, Thema); aktive Filter als Chips zum Entfernen, „Vergleichen“ ab 2 gemerkten Zielen.
  Kosten: `tripCost()` rechnet für die gewählte Gruppe (Knopf „2 P. · 7 N.“ bzw. Kostenrechner im Ziel-Blatt): Doppelzimmer je
  2 Personen × Nächte + Flüge pro Person, optional Ausgaben vor Ort (`daily` am Ziel, sonst geschätzt aus dem Hotelpreis).
  Karten, Budget-Filter, Sortierung „Günstig“, Vergleich und eigene Reisen nutzen denselben Wert.
  Im `localStorage`: `inspo.month`, `inspo.view`, `inspo.favs` (auch als „Gemerkte Ideen“ auf der Übersicht),
  `inspo.prefs` (Personen, Nächte, vor Ort, Sortierung, Flugzeit, Budget). Fotos lädt dieselbe Action.
- Eigene Reisen: „Als Reise planen“ im Ziel-Blatt speichert `{id: "x-<ziel>-<datum>", dest, start, nights}` in `localStorage`
  `mytrips`; `buildMyTrip()` baut daraus beim Laden eine normale Reise (Tagesplan aus `week`, Checklisten, Infos) unter `/<id>/`.
  Nur in diesem Browser; „Entwurf löschen“ unter Infos.
- Buchungen (Flug, Hotel, Zug, Mietwagen, Ticket): fest in der Reisedatei als `bookings: [{type, title, date, time, info, ref, url}]`
  oder selbst unter Infos eingetragen (`<id>.bookings`). Sie erscheinen im Tagesplan (nach Uhrzeit), im Kalender-Export,
  vor der Reise als „Nächste Buchung“ und am Vortag/Tag selbst in der Status-Zeile (auch auf der Übersicht).
- Tagesroute: „Auf der Karte“ klappt im Tag eine Karte mit nummerierten Stopps auf; der Fußweg kommt vom OSM-Routing
  (`routing.openstreetmap.de/routed-foot`, FOSSGIS, in der CSP erlaubt) und wird pro Strecke gespeichert (`<id>.route.<koordinaten>`),
  ohne Netz bleibt die gestrichelte Luftlinie. Im Smoke-Test ist der Dienst gemockt.
- Tagesplan: Fußweg zwischen aufeinanderfolgenden Orten, „Route des Tages“ (Google Maps, zu Fuß, alle Orte der Hauptstadt des Tages)
  und „Bei Regen: Ideen für drinnen“ (Orte aus den Kategorien `indoor` der Reise, nahe dem Tagesprogramm). Sagt die
  Vorhersage (16 Tage) für einen Reisetag Regen an (≥ 60 % oder Regen-Code), klappt der Kasten auf.
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
- Browser-Speicher pro Reise mit Präfix `<id>.`: `checks` (Checklisten), `favs` (gemerkte Orte), `wx` (letzte Wettervorhersage), `tab`, `bookings`.
- Entdecken: Stadt-Umschalter, sobald Orte ein `city` haben (Suche läuft über alle Städte); lange Gruppen zeigen erst die
  6 besten (Bewertung gewichtet mit Anzahl), Rest per „Alle anzeigen“. Ort antippen (Liste, Karte, Plan-Text) öffnet das
  Detailblatt (`openSheet`) mit Foto, Route, Karte, Website, Merken; schließt per ×, Hintergrund, Wischen, Escape, Zurück.
- Handy: kompakte Titelleiste (`#navbar`) erscheint, wenn die große Überschrift aus dem Bild scrollt.
- Während der Reise: Plan springt beim Öffnen zum heutigen Tag; Karte „Jetzt / Als Nächstes“ oben im Plan (`renderNow`, aktualisiert jede Minute).
- Leaflet wird erst beim Öffnen von „Entdecken“ bzw. der Weltkarte nachgeladen (`loadLeaflet`, Kacheln über `tiles()`).
- Kalender-Export (.ics) unter Infos: Uhrzeiten gelten als Ortszeit `tz` der Reise und werden in UTC umgerechnet.
- Routen/Suche öffnen auf Apple-Geräten Apple Karten, sonst Google Maps.
- Orte: optional `rating`/`reviews` (Tripadvisor, Stand angeben), `city` (andere Stadt als `center.name`, z. B. Rom-Tag – nur Liste, Kartensuche in dieser Stadt), `price`, `kind`, `free`.
- Fotos: Feld `wiki` (Titel der englischen Wikipedia, oder `de:`/`it:` + Titel) an Reise, Tag und Ort. `app.js` holt das
  Titelbild über die Wikipedia-REST-API (`/page/summary/`), lädt erst kurz vor Sichtbarkeit (IntersectionObserver),
  höchstens 4 gleichzeitig, merkt sich Ergebnisse 14 Tage in `localStorage` (`wiki:<titel>`). Kein Treffer → Platzhalter verschwindet.
  Fotos kommen bevorzugt aus `public/photos/` (`photos.json`: Titel → Datei klein `s`/groß `l`, Wikipedia-Seite `page`).
  Die GitHub Action „Fotos laden“ (`.github/workflows/photos.yml`, `tools/fetch-photos.js`) lädt sie bei Änderungen an
  `public/assets/trips/**` auf `main` herunter und committet sie – danach Branch neu holen. Live-API nur als Rückfall.
  Tests bilden Wikipedia nach (Service Worker blockiert, sonst umgeht er die Mocks).
- Optionale Tagesfelder: `extras` (Liste „Falls noch Zeit ist“, gleiche Felder wie Programmpunkte ohne `time`, nicht im Kalender-Export/Jetzt-Karte), `tip`, `alt` (Alternative), `ni` (Nordirland-Hinweis), `image` (feste Bilder in `IMAGES`), `wiki`.
- Bei Änderungen an Dateien unter `public/assets/`: `?v=` in `index.html` und `sw.js` sowie `VERSION` in `sw.js` hochzählen.
- Prüfen: `npx wrangler dev`, dann `node tools/smoke.js` (Playwright; externe Anfragen werden blockiert).
