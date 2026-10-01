/* Reise-App: Übersicht aller Reisen unter / und je Reise Plan, Entdecken (Karte + Liste) und Infos unter /<id>/.
   Daten kommen aus assets/trips/<id>.js (window.TRIPS), Icons aus assets/icons.svg (Lucide). */
(() => {
  "use strict";
  const TRIPS = window.TRIPS || [];
  // CARTO-Basemaps-Schlüssel (nur für Kartenkacheln; im CARTO-Dashboard auf die eigene Domain beschränken)
  const CARTO_KEY = "cb1_45hl_1_a993a77a0790827a9e06d41f";

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (name) => `<svg class="i" aria-hidden="true"><use href="/assets/icons.svg#${esc(name)}"/></svg>`;
  const num = (n) => String(n).replace(".", ",");

  // ---------- Reisezeitraum ----------
  const DAY_MS = 864e5;
  const dateOf = (iso) => new Date(iso + "T00:00:00");
  function dayIndex(trip, now = new Date()) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((today - dateOf(trip.start)) / DAY_MS);
  }
  function tripStatus(trip) {
    const i = dayIndex(trip), n = trip.days.length;
    if (i < 0) return { kind: "soon", days: -i, icon: "clock", text: i === -1 ? "Morgen geht’s los" : `Noch ${-i} Tage` };
    if (i < n) return { kind: "now", days: 0, icon: "map-pin", text: `Heute: Tag ${i + 1} von ${n}` };
    return { kind: "past", days: i, icon: "check", text: "Abgeschlossen" };
  }
  function dateRange(trip) {
    const a = dateOf(trip.start), b = dateOf(trip.end || trip.start);
    const f = (d, o) => d.toLocaleDateString("de-DE", o);
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()}.–${f(b, { day: "numeric", month: "long", year: "numeric" })}`
      : `${f(a, { day: "numeric", month: "short" })} – ${f(b, { day: "numeric", month: "short", year: "numeric" })}`;
  }
  const setStatus = (st) => { $("#status").innerHTML = st ? `${ic(st.icon)}${esc(st.text)}` : ""; };
  function registerSW() {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }

  // ---------- Bilder aus Wikipedia ----------
  // Orte/Tage/Reisen mit `wiki: "Artikel"` (englische Wikipedia, oder "de:Artikel") bekommen das Titelbild des Artikels.
  // Zuerst aus /photos/ (von der GitHub Action „Fotos laden“ heruntergeladen, siehe tools/fetch-photos.js),
  // sonst live über die Wikipedia-API. Geladen wird erst kurz bevor das Element sichtbar wird.
  const photosReady = fetch("/photos/photos.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  const WIKI_TTL = 14 * 864e5, wikiMem = new Map(), wikiQueue = [];
  let wikiActive = 0;
  function wikiFetch(title) {
    const [lang, name] = /^[a-z]{2}:/.test(title) ? [title.slice(0, 2), title.slice(3)] : ["en", title];
    return fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, "_"))}`)
      .then((r) => r.status === 404 ? null : r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
      .then((j) => {
        const th = j && j.thumbnail, orig = j && j.originalimage;
        const v = th ? {
          // Wikimedia liefert nur Standardbreiten (330, 500, 960 …)
          thumb: orig && orig.width <= 330 ? orig.source : th.source.replace(/\/\d+px-/, "/330px-"),
          large: orig && orig.width <= 1280 ? orig.source : th.source.replace(/\/\d+px-/, "/960px-"),
          page: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ""
        } : null;
        try { localStorage.setItem("wiki2:" + title, JSON.stringify({ at: Date.now(), v })); } catch { /* voll */ }
        return v;
      });
  }
  function wikiImage(title) {
    if (wikiMem.has(title)) return wikiMem.get(title);
    const p = photosReady.then((m) => {
      const e = m[title];
      if (e && e.s) return { thumb: "/photos/" + e.s, large: "/photos/" + (e.l || e.s), page: e.page || "" };
      if (e && e.none) return null;
      return remoteWikiImage(title);
    });
    wikiMem.set(title, p);
    return p;
  }
  function remoteWikiImage(title) {
    try {
      const c = JSON.parse(localStorage.getItem("wiki2:" + title));
      if (c && Date.now() - c.at < WIKI_TTL) { const p = Promise.resolve(c.v); wikiMem.set(title, p); return p; }
    } catch { /* kaputt */ }
    const p = new Promise((res) => {
      const run = () => {
        wikiActive++;
        wikiFetch(title).then(res, () => { wikiMem.delete(title); res(null); })  // offline: später erneut versuchen
          .finally(() => { wikiActive--; const n = wikiQueue.shift(); if (n) n(); });
      };
      wikiActive < 4 ? run() : wikiQueue.push(run);
    });
    wikiMem.set(title, p);
    return p;
  }
  // Füllt Platzhalter [data-wiki]: data-size="thumb|large", ohne Treffer wird das Element entfernt.
  function fillWiki(el) {
    wikiImage(el.dataset.wiki).then((v) => {
      if (!v) { el.remove(); return; }
      const img = new Image();
      img.alt = ""; img.decoding = "async";
      img.onload = () => el.classList.add("is-loaded");
      img.onerror = () => el.remove();
      img.src = el.dataset.size === "large" ? v.large : v.thumb;
      el.prepend(img);
      const credit = el.querySelector("[data-credit]");
      if (credit && v.page) credit.href = v.page;
    });
  }
  const wikiObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) { wikiObserver.unobserve(e.target); fillWiki(e.target); }
      }), { rootMargin: "600px 0px" })
    : null;
  function observeWiki(root = document) {
    root.querySelectorAll("[data-wiki]:not([data-wiki-seen])").forEach((el) => {
      el.dataset.wikiSeen = "1";
      wikiObserver ? wikiObserver.observe(el) : fillWiki(el);
    });
  }
  const wikiSlot = (title, cls, size = "thumb", credit = false) => title
    ? `<div class="${cls}" data-wiki="${esc(title)}" data-size="${size}">${credit ? `<a data-credit href="https://wikipedia.org" target="_blank" rel="noopener">Foto: Wikipedia</a>` : ""}</div>` : "";
  // Suche ohne Akzente: „Mimi“ findet „Mimì“, „cafe“ findet „Caffè“
  const fold = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // ---------- Übersicht aller Reisen ----------
  function renderHub() {
    const order = { now: 0, soon: 1, past: 2 };
    const list = TRIPS.map((t) => ({ t, st: tripStatus(t) }))
      .sort((a, b) => order[a.st.kind] - order[b.st.kind] ||
        (a.st.kind === "past" ? b.t.start.localeCompare(a.t.start) : a.t.start.localeCompare(b.t.start)));
    const next = list.find((x) => x.st.kind !== "past");
    $("#subtitle").textContent = `${TRIPS.length} ${TRIPS.length === 1 ? "Reise" : "Reisen"} · Pläne, Karten & Checklisten`;
    setStatus(next && (next.st.kind === "now"
      ? { icon: "map-pin", text: `Unterwegs: ${next.t.title}` }
      : { icon: "plane", text: `${next.t.title} in ${next.st.days} ${next.st.days === 1 ? "Tag" : "Tagen"}` }));

    const card = ({ t, st }) => `<a class="trip-card t-${esc(t.theme)} ${st.kind === "past" ? "is-past" : ""}" href="/${esc(t.id)}/">
      <div class="trip-cover">
        ${wikiSlot(t.wiki, "cover-photo", "large")}
        <img class="trip-icon" src="${esc(t.icon)}" alt="" width="56" height="56">
        <div><div class="t">${esc(t.title)}</div><div class="d">${esc(dateRange(t))}</div></div>
        <span class="badge">${esc(st.kind === "past" ? "Vorbei" : st.text)}</span>
      </div>
      <div class="trip-foot">
        <span>${ic("calendar-days")}${t.days.length} Tage</span>
        <span>${ic("map-pin")}${t.places.length} Orte</span>
        <span class="go">${ic("chevron-right")}</span>
      </div>
    </a>`;
    const upcoming = list.filter((x) => x.st.kind !== "past"), past = list.filter((x) => x.st.kind === "past");
    $("#hubList").innerHTML = !list.length ? `<div class="card empty">Noch keine Reise angelegt.</div>` : [
      upcoming.length ? `<div class="section"><div class="group-label">Anstehend</div><div class="hub-list">${upcoming.map(card).join("")}</div></div>` : "",
      past.length ? `<div class="section"><div class="group-label">Vergangen</div><div class="hub-list">${past.map(card).join("")}</div></div>` : ""
    ].join("");
    observeWiki($("#hubList"));
    registerSW();
  }

  // ---------- Welche Seite? ----------
  const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean)[0] || "");
  const TRIP = TRIPS.find((t) => t.id === slug);
  if (!TRIP) {
    // Alte Links aus der Zeit, als die Seite nur Irland war (/#entdecken usw.)
    const legacy = () => {
      if (/^#(plan|entdecken|infos|tag-)/.test(location.hash) && TRIPS.some((t) => t.id === "irland")) {
        location.replace("/irland/" + location.hash); return true;
      }
      return false;
    };
    if (!slug && legacy()) return;
    if (slug) history.replaceState(null, "", "/");
    window.addEventListener("hashchange", legacy);
    renderHub();
    return;
  }

  const { days: DAYS, places: PLACES, cats: CATS, checklists: CHECKLISTS, infos: INFOS, images: IMAGES = {} } = TRIP;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(TRIP.id + "." + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(TRIP.id + "." + k, JSON.stringify(v)); } catch { /* privat/voll */ } }
  };
  const byId = Object.fromEntries(PLACES.map((p) => [p.id, p]));
  const hasPos = (p) => typeof p.lat === "number" && typeof p.lng === "number";

  // ---------- Entfernungen & Links ----------
  function km(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const fmtKm = (d) => d < 1 ? `${Math.round(d * 100) * 10} m` : `${num(d.toFixed(1))} km`;
  const walk = (d) => { const m = Math.round(d * 13); return m < 60 ? `${Math.max(m, 1)} Min.` : `${Math.floor(m / 60)} Std. ${m % 60} Min.`; };
  // Auf iPhone/iPad/Mac öffnen Routen in Apple Karten, sonst in Google Maps
  const APPLE = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  const mapsSearch = (p) => APPLE
    ? `https://maps.apple.com/?q=${encodeURIComponent(p.name + ", " + (p.city || TRIP.center.name))}`
    : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.name + " " + (p.city || TRIP.center.name));
  const mapsRoute = (p) => APPLE
    ? `https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`;
  const pad = (n) => String(n).padStart(2, "0");
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  function toast(text) {
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = text;
    document.body.append(t);
    setTimeout(() => t.classList.add("out"), 1800);
    setTimeout(() => t.remove(), 2200);
  }
  const ext = (url, label, icon = "arrow-up-right", cls = "btn") =>
    `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${ic(icon)}${esc(label)}</a>`;
  const linkIcon = (label) => /ticket/i.test(label) ? "ticket" : /reserv/i.test(label) ? "utensils" : /karte/i.test(label) ? "map" : "arrow-up-right";

  // Bezugspunkt für Entfernungen: eigener Standort, sonst Hotel, sonst ein fester Punkt der Reise (z. B. der Dom)
  const home = () => TRIP.hotel || TRIP.base;
  const homeLabel = () => TRIP.hotel ? "vom Hotel" : TRIP.base.label;

  function renderHeader() {
    document.documentElement.dataset.theme = TRIP.theme;
    document.title = `${TRIP.title} – Reiseplan`;
    $("#hubView").hidden = true;
    $("#tripView").hidden = false;
    $("#back").hidden = false;
    $("#heroIcon").src = TRIP.icon;
    $("#eyebrow").textContent = dateRange(TRIP);
    $("#title").textContent = TRIP.title;
    $("#subtitle").textContent = TRIP.subtitle;
    $("#wxTitle").textContent = "Wetter in " + TRIP.center.name;
    setStatus(tripStatus(TRIP));
    if (TRIP.notice) { $("#notice").textContent = TRIP.notice; $("#noticeBox").hidden = false; }
  }

  // ---------- Plan ----------
  function renderFacts() {
    $("#facts").innerHTML = TRIP.facts.map((f) =>
      `<div class="row"><div class="k">${esc(f.label)}</div><div class="v">${esc(f.value)}</div></div>`).join("");
    $("#cost").textContent = TRIP.cost || "";
  }

  function renderDays() {
    const today = dayIndex(TRIP);
    const hhmm = nowHM();

    $("#daynav").innerHTML = DAYS.map((d, i) =>
      `<a href="#tag-${i + 1}" class="${i === today ? "is-today" : ""}"><small>${esc(d.date.split(" ")[0])}</small><b>${esc(parseInt(d.date.split(" ")[1], 10) || i + 1)}</b></a>`).join("");

    $("#days").innerHTML = DAYS.map((d, i) => {
      const isToday = i === today;
      const nowIdx = isToday ? d.stops.reduce((acc, s, j) => (s.time <= hhmm ? j : acc), -1) : -1;
      const img = d.image && IMAGES[d.image];
      const tags = [
        isToday ? `<span class="tag today">Heute</span>` : "",
        d.tip ? `<span class="tag">${ic("info")}${esc(d.tip)}</span>` : "",
        d.ni ? `<span class="tag warn">${ic("id-card")}Nordirland: Pass & Pfund</span>` : "",
        d.alt ? `<span class="tag alt">${ic("shuffle")}${esc(d.alt)}</span>` : ""
      ].join("");
      const stops = d.stops.map((s, j) => {
        const place = s.place && byId[s.place];
        const acts = [
          ...(s.links || []).map((l) => ext(l.url, l.label, linkIcon(l.label))),
          !place ? "" : hasPos(place) ? `<a class="btn" href="#entdecken/${esc(place.id)}">${ic("map-pin")}Karte</a>`
            : place.url && !(s.links || []).some((l) => l.url === place.url) ? ext(place.url, "Infos")
            : !place.url ? ext(mapsSearch(place), "Karte", "map-pin") : ""
        ].join("");
        const cls = isToday ? (j === nowIdx ? "is-now" : j < nowIdx ? "is-past" : "") : "";
        return `<li class="stop ${cls}">
          <div class="time">${esc(s.time)}</div>
          <div class="tile">${ic(s.icon)}</div>
          <div><div class="txt">${esc(s.text)}</div><div class="acts">${acts}</div></div>
        </li>`;
      }).join("");
      return `<article class="card day ${isToday ? "is-today" : ""}" id="tag-${i + 1}">
        ${img ? `<div class="day-img is-loaded"><img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy" decoding="async" width="960" height="480"><a href="${esc(img.page)}" target="_blank" rel="noopener">Foto: Wikimedia</a></div>`
          : wikiSlot(d.wiki, "day-img", "large", true)}
        <div class="day-head">
          <div class="day-kicker">Tag ${i + 1} · ${esc(d.date)}</div>
          <h3 class="day-title">${esc(d.title)}</h3>
          ${tags ? `<div class="day-meta">${tags}</div>` : ""}
        </div>
        <ol class="timeline">${stops}</ol>
      </article>`;
    }).join("");

    // Wikimedia-Vorschau fehlt (z. B. offline) → Bildbereich ausblenden
    document.querySelectorAll(".day-img img").forEach((im) => im.addEventListener("error", () => im.parentElement.remove(), { once: true }));
    observeWiki($("#days"));
  }

  function renderNow() {
    const i = dayIndex(TRIP), box = $("#nowBox");
    if (i < 0 || i >= DAYS.length) { box.hidden = true; return; }
    const d = DAYS[i], hhmm = nowHM();
    const cur = d.stops.reduce((acc, s, j) => (s.time <= hhmm ? j : acc), -1);
    const row = (label, s, day) => `<a class="row has-tile" href="#tag-${day + 1}">
      <div class="tile">${ic(s.icon)}</div>
      <div class="main"><div class="text">${esc(label)} · ${esc(s.time)}</div><div class="title">${esc(s.text)}</div></div>
      <span class="trail">${ic("chevron-right")}</span></a>`;
    const rows = [];
    if (cur >= 0) rows.push(row("Jetzt", d.stops[cur], i));
    if (d.stops[cur + 1]) rows.push(row("Als Nächstes", d.stops[cur + 1], i));
    else if (DAYS[i + 1]) rows.push(row("Morgen", DAYS[i + 1].stops[0], i + 1));
    box.innerHTML = `<div class="group-label">Heute · Tag ${i + 1}: ${esc(d.title)}</div><div class="list">${rows.join("")}</div>`;
    box.hidden = !rows.length;
  }

  // ---------- Wetter (Open-Meteo) ----------
  const WX = [[[0], "sun", "Sonnig", "sun"], [[1, 2], "cloud-sun", "Heiter", "sun"], [[3], "cloud", "Bewölkt"], [[45, 48], "cloud-fog", "Nebel"],
    [[51, 53, 55, 56, 57], "cloud-drizzle", "Niesel", "rain"], [[61, 63, 65, 66, 67, 80, 81, 82], "cloud-rain", "Regen", "rain"],
    [[71, 73, 75, 77, 85, 86], "cloud-snow", "Schnee"], [[95, 96, 99], "cloud-lightning", "Gewitter", "rain"]];

  function drawWeather(data, stamp) {
    const d = data.daily;
    $("#weather").innerHTML = d.time.map((t, i) => {
      const [, icon, label, tone = ""] = WX.find(([codes]) => codes.includes(d.weather_code[i])) || [0, "cloud", ""];
      const day = i === 0 ? "Heute" : new Date(t + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
      const rain = d.precipitation_probability_max[i];
      return `<div class="wx" title="${esc(label)}">
        <div class="d">${esc(day)}</div>
        <div class="ic ${tone}" role="img" aria-label="${esc(label)}">${ic(icon)}</div>
        <div class="t">${Math.round(d.temperature_2m_max[i])}° <span>${Math.round(d.temperature_2m_min[i])}°</span></div>
        <div class="r">${rain >= 20 ? `${ic("droplet")}${rain} %` : "&nbsp;"}</div>
      </div>`;
    }).join("");
    $("#wxUpdated").textContent = "Stand " + new Date(stamp).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  async function initWeather() {
    const cached = store.get("wx");
    if (cached) drawWeather(cached.data, cached.at);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${TRIP.center.lat}&longitude=${TRIP.center.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const at = Date.now();
      store.set("wx", { data, at });
      drawWeather(data, at);
    } catch {
      if (!cached) {
        $("#weather").innerHTML = `<div class="wx-empty">Keine Verbindung – das Wetter lädt, sobald du wieder online bist.</div>`;
        $("#wxUpdated").textContent = "offline";
      }
    }
  }

  // ---------- Entdecken ----------
  const state = { cats: new Set(), q: "", near: false, sort: "cat", me: null, focus: null, favOnly: false, favs: new Set(store.get("favs", [])) };
  let map = null, layer = null, markers = {}, meMarker = null;

  const refPoint = () => state.me || home();
  const refLabel = () => state.me ? "von dir" : homeLabel();
  const catsOf = (p) => p.cats.map((c) => CATS[c]).filter(Boolean);
  const searchText = (p) => fold([p.name, p.note, p.kind, p.price, p.city, ...catsOf(p).map((c) => c.label), p.free ? "frei kostenlos gratis" : ""].join(" "));
  PLACES.forEach((p) => { p._s = searchText(p); });

  function visiblePlaces() {
    const terms = fold(state.q).split(/\s+/).filter(Boolean);
    return PLACES.filter((p) =>
      (state.cats.size === 0 || p.cats.some((c) => state.cats.has(c))) &&
      terms.every((t) => p._s.includes(t)) &&
      (!state.near || (hasPos(p) && km(home(), p) <= TRIP.near)) &&
      (!state.favOnly || state.favs.has(p.id)));
  }

  function syncChips() {
    $("#chips").querySelectorAll(".chip[data-cat]").forEach((c) =>
      c.setAttribute("aria-pressed", String(c.dataset.cat ? state.cats.has(c.dataset.cat) : state.cats.size === 0 && !state.favOnly)));
    const fav = $("#chips .chip-fav");
    fav.setAttribute("aria-pressed", String(state.favOnly));
    fav.querySelector("[data-favcount]").textContent = state.favs.size ? ` ${state.favs.size}` : "";
  }
  function renderChips() {
    $("#chips").innerHTML = [`<button class="chip" type="button" data-cat="" aria-pressed="true">Alle</button>`,
      `<button class="chip chip-fav" type="button" aria-pressed="false">${ic("heart")}Gemerkt<span data-favcount></span></button>`]
      .concat(Object.entries(CATS).map(([k, c]) =>
        `<button class="chip" type="button" data-cat="${esc(k)}" aria-pressed="false" style="--c:${esc(c.color)}">${ic(c.icon)}${esc(c.label)}</button>`))
      .join("");
    $("#chips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      const cat = b.dataset.cat;
      if (b.classList.contains("chip-fav")) state.favOnly = !state.favOnly;
      else if (!cat) { state.cats.clear(); state.favOnly = false; }
      else state.cats.has(cat) ? state.cats.delete(cat) : state.cats.add(cat);
      syncChips();
      refresh();
    });
  }

  function placeRow(p) {
    const cat = CATS[p.cats[0]];
    const d = hasPos(p) ? km(refPoint(), p) : null;
    const meta = [
      p.rating ? `<span class="star">${ic("star")}${num(p.rating)}${p.reviews ? `<small>(${p.reviews.toLocaleString("de-DE")})</small>` : ""}</span>` : "",
      p.city ? `<span>${esc(p.city)}</span>` : "",
      p.kind ? `<span>${esc(p.kind)}</span>` : "",
      p.price ? `<span>${esc(p.price)}</span>` : "",
      d !== null ? `<span>${fmtKm(d)} ${esc(refLabel())}${d < 4 ? ` · ${walk(d)} zu Fuß` : ""}</span>` : ""
    ].filter(Boolean).join("");
    const acts = [
      hasPos(p) ? `<button class="btn" type="button" data-show="${esc(p.id)}">${ic("map-pin")}Karte</button>` : "",
      hasPos(p) ? ext(mapsRoute(p), "Route", "route") : "",
      p.url ? ext(p.url, "Website", "globe") : ext(mapsSearch(p), "Suchen", "search")
    ].join("");
    return `<div class="row has-tile place ${state.focus === p.id ? "is-focus" : ""}" id="p-${esc(p.id)}">
      <div class="tile" style="--c:${esc(cat.color)}">${ic(cat.icon)}</div>
      <div class="main">
        <div class="head"><div class="title">${esc(p.name)}${p.free ? `<span class="free">FREI</span>` : ""}</div>
          <button class="fav" type="button" data-fav="${esc(p.id)}" aria-pressed="${state.favs.has(p.id)}" aria-label="${esc(p.name)} merken">${ic("heart")}</button></div>
        ${meta ? `<div class="meta">${meta}</div>` : ""}
        ${p.note ? `<div class="note">${esc(p.note)}</div>` : ""}
        <div class="acts">${acts}</div>
      </div>
      ${wikiSlot(p.wiki, "ph")}
    </div>`;
  }

  function renderList(list) {
    $("#count").textContent = `${list.length} ${list.length === 1 ? "Ort" : "Orte"}${state.near ? ` im Umkreis von ${num(TRIP.near)} km ${TRIP.hotel ? "um das Hotel" : TRIP.base.around}` : ""}`;
    if (!list.length) {
      $("#list").innerHTML = `<div class="list empty">${state.favOnly && !state.favs.size
        ? "Noch nichts gemerkt – tippe bei einem Ort auf das Herz."
        : "Nichts gefunden. Filter zurücksetzen?"}</div>`;
      return;
    }
    if (state.sort === "cat") {
      const groups = {};
      list.forEach((p) => { (groups[p.cats.find((c) => state.cats.has(c)) || p.cats[0]] ||= []).push(p); });
      $("#list").innerHTML = Object.keys(CATS).filter((k) => groups[k]).map((k) =>
        `<div class="group"><div class="group-label">${esc(CATS[k].label)} · ${groups[k].length}</div>
         <div class="list">${groups[k].map(placeRow).join("")}</div></div>`).join("");
    } else {
      const sorted = [...list].sort(state.sort === "dist"
        ? (a, b) => (hasPos(a) ? km(refPoint(), a) : 1e9) - (hasPos(b) ? km(refPoint(), b) : 1e9)
        : (a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0));
      $("#list").innerHTML = `<div class="group"><div class="list">${sorted.map(placeRow).join("")}</div></div>`;
    }
    observeWiki($("#list"));
  }

  function popupHtml(p) {
    const d = km(refPoint(), p);
    return `${p.wiki ? `<div class="pimg" data-wiki="${esc(p.wiki)}" data-size="thumb"></div>` : ""}<div class="pt">${esc(p.name)}</div>
      <div class="pm">${esc(catsOf(p).map((c) => c.label).join(" · "))}${p.rating ? ` · ★ ${num(p.rating)}` : ""}</div>
      ${p.note ? `<div class="pn">${esc(p.note)}</div>` : ""}
      <div class="pm">${fmtKm(d)} ${esc(refLabel())} · ${walk(d)} zu Fuß</div>
      <div class="acts">${ext(mapsRoute(p), "Route", "route", "btn btn-fill")}${p.url ? ext(p.url, "Website", "globe") : ""}</div>`;
  }

  function refresh() {
    const list = visiblePlaces();
    renderList(list);
    if (!map) return;
    const show = new Set(list.map((p) => p.id));
    Object.entries(markers).forEach(([id, m]) => {
      if (show.has(id)) { if (!layer.hasLayer(m)) layer.addLayer(m); m.setPopupContent(popupHtml(byId[id])); }
      else layer.removeLayer(m);
    });
  }

  const pinIcon = (html, cls, size, color = "") => L.divIcon({
    className: "", html: `<div class="${cls}"${color ? ` style="--c:${esc(color)}"` : ""}>${html}</div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2]
  });

  let leafletLoading = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    const load = (el) => new Promise((res, rej) => { el.onload = res; el.onerror = rej; });
    const css = Object.assign(document.createElement("link"), { rel: "stylesheet", href: "/assets/vendor/leaflet/leaflet.css" });
    const js = Object.assign(document.createElement("script"), { src: "/assets/vendor/leaflet/leaflet.js" });
    const done = Promise.all([load(css), load(js)]);
    document.head.insertBefore(css, document.querySelector('link[href^="/assets/app.css"]'));  // app.css überschreibt Leaflet
    document.head.append(js);
    return (leafletLoading ||= done);
  }
  const ensureMap = () => (leafletLoading || loadLeaflet()).then(() => { initMap(); map.invalidateSize(); });

  function initMap() {
    if (map || !window.L) return;
    map = L.map("map", { scrollWheelZoom: false, zoomControl: false }).setView([TRIP.center.lat, TRIP.center.lng], TRIP.center.zoom || 14);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    map.attributionControl.setPrefix(false).setPosition("bottomleft");

    layer = L.layerGroup().addTo(map);
    PLACES.filter(hasPos).forEach((p) => {
      const cat = CATS[p.cats[0]];
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(ic(cat.icon), "pin", 26, cat.color), title: p.name, riseOnHover: true })
        .bindPopup(popupHtml(p), { maxWidth: 270 });
      m.on("popupopen", (e) => {
        highlight(p.id);
        const el = e.popup.getElement().querySelector(".pimg:not(.is-loaded)");
        if (el) wikiImage(el.dataset.wiki).then((v) => {
          if (!v) return el.remove();
          const img = new Image();
          img.onload = () => { el.classList.add("is-loaded"); e.popup.update(); };
          img.src = v.thumb; img.alt = "";
          el.append(img);
        });
      });
      markers[p.id] = m;
    });

    const H = TRIP.hotel;
    if (H) L.marker([H.lat, H.lng], { title: H.name, zIndexOffset: 1000, icon: pinIcon(ic("bed-double"), "pin pin-home", 34) })
      .addTo(map)
      .bindPopup(`<div class="pt">${esc(H.name)}</div><div class="pm">${esc(H.address)}</div><div class="acts">${ext(H.url, "Website", "globe")}</div>`);

    refresh();
  }

  function highlight(id) {
    state.focus = id;
    document.querySelectorAll(".place.is-focus").forEach((e) => e.classList.remove("is-focus"));
    $("#p-" + CSS.escape(id))?.classList.add("is-focus");
  }

  function showOnMap(id) {
    const p = byId[id]; if (!p || !hasPos(p) || !map) return;
    // Ort sichtbar machen, falls er gerade herausgefiltert ist
    if (!visiblePlaces().some((x) => x.id === id)) {
      state.cats.clear(); state.q = ""; state.near = false; state.favOnly = false;
      $("#q").value = ""; $("#nearBtn").setAttribute("aria-pressed", "false");
      syncChips();
      refresh();
    }
    highlight(id);
    $(".mapbox").scrollIntoView({ behavior: "smooth", block: "start" });
    map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16), { animate: true });
    markers[id].openPopup();
  }

  function locate() {
    const btn = $("#locateBtn");
    if (!navigator.geolocation || !map) return;
    btn.setAttribute("aria-busy", "true");
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      state.me = { lat, lng };
      if (!meMarker) {
        meMarker = L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<div class="pin-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 900 })
          .addTo(map).bindPopup(`Du bist hier (± ${Math.round(accuracy)} m)`);
      } else meMarker.setLatLng([lat, lng]);
      map.setView([lat, lng], Math.max(map.getZoom(), 15));
      btn.setAttribute("aria-pressed", "true");
      btn.removeAttribute("aria-busy");
      refresh();
    }, () => { btn.removeAttribute("aria-busy"); btn.title = "Kein Zugriff auf den Standort"; },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  function initDiscover() {
    $("#nearBtn").innerHTML = `${ic(TRIP.hotel ? "bed-double" : "map-pin")}≤ ${num(TRIP.near)} km ${esc(homeLabel())}`;
    $("#q").placeholder = `Suchen in ${PLACES.length} Orten`;
    renderChips();
    syncChips();
    let t;
    $("#q").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); refresh(); }, 120); });
    $("#sort").addEventListener("click", (e) => {
      const b = e.target.closest("[data-sort]"); if (!b) return;
      state.sort = b.dataset.sort;
      $("#sort").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      refresh();
    });
    $("#nearBtn").addEventListener("click", (e) => {
      state.near = !state.near;
      e.currentTarget.setAttribute("aria-pressed", String(state.near));
      if (map && state.near) map.setView([home().lat, home().lng], 15);
      refresh();
    });
    $("#locateBtn").addEventListener("click", locate);
    $("#list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-show]");
      if (b) showOnMap(b.dataset.show);
      const f = e.target.closest("[data-fav]");
      if (f) {
        const id = f.dataset.fav, on = !state.favs.has(id);
        on ? state.favs.add(id) : state.favs.delete(id);
        store.set("favs", [...state.favs]);
        f.setAttribute("aria-pressed", String(on));
        syncChips();
        if (state.favOnly) refresh();
      }
    });
    refresh();
  }

  // ---------- Kalender-Export (.ics) & Teilen ----------
  // Uhrzeiten im Plan sind Ortszeit am Reiseziel (TRIP.tz) → für den Kalender in UTC umrechnen.
  function tzOffset(t, tz) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(t).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t;
  }
  function zonedToUtc(y, m, d, hm, tz) {
    const [H, M] = hm.split(":").map(Number);
    const wall = Date.UTC(y, m, d, H, M);
    let t = wall - tzOffset(wall, tz);
    t = wall - tzOffset(t, tz);  // Sommer-/Winterzeitwechsel
    return new Date(t);
  }
  const icsDate = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const icsText = (v) => String(v).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const icsFold = (line) => line.match(/.{1,60}/gu).join("\r\n ");

  function exportCalendar() {
    const tz = TRIP.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [y, m, d0] = TRIP.start.split("-").map(Number);
    const stamp = icsDate(new Date());
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Reisen//Reiseplan//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + icsText(TRIP.title)];
    DAYS.forEach((day, i) => day.stops.forEach((s, j) => {
      if (!/^\d\d:\d\d$/.test(s.time)) return;
      const start = zonedToUtc(y, m - 1, d0 + i, s.time, tz);
      const next = day.stops[j + 1];
      const until = next && /^\d\d:\d\d$/.test(next.time) ? zonedToUtc(y, m - 1, d0 + i, next.time, tz) - start : 3600e3;
      const end = new Date(start.getTime() + Math.min(Math.max(until, 1800e3), 3 * 3600e3));
      const place = s.place && byId[s.place];
      const url = (s.links && s.links[0] && s.links[0].url) || (place && place.url);
      lines.push("BEGIN:VEVENT", `UID:${TRIP.id}-${i + 1}-${j + 1}@reisen`, "DTSTAMP:" + stamp,
        "DTSTART:" + icsDate(start), "DTEND:" + icsDate(end), "SUMMARY:" + icsText(s.text),
        "DESCRIPTION:" + icsText(`${TRIP.title} – Tag ${i + 1}: ${day.title}`));
      if (place) lines.push("LOCATION:" + icsText(place.name + ", " + TRIP.center.name));
      if (place && hasPos(place)) lines.push(`GEO:${place.lat};${place.lng}`);
      if (url) lines.push("URL:" + url);
      lines.push("END:VEVENT");
    }));
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.map(icsFold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${TRIP.id}.ics` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    return lines.length;
  }

  async function shareTrip() {
    const data = { title: `${TRIP.title} – Reiseplan`, url: `${location.origin}/${TRIP.id}/` };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); toast("Link kopiert"); }
    } catch { /* abgebrochen */ }
  }

  // ---------- Infos ----------
  function renderInfos() {
    $("#tools").innerHTML = `
      <button class="row has-tile" type="button" data-act="ics"><div class="tile">${ic("calendar-plus")}</div>
        <div class="main"><div class="title">Zum Kalender hinzufügen</div><div class="text">Alle Programmpunkte als Termine (.ics)</div></div></button>
      <button class="row has-tile" type="button" data-act="share"><div class="tile">${ic("share")}</div>
        <div class="main"><div class="title">Reise teilen</div><div class="text">Link zu dieser Seite senden</div></div></button>`;
    $("#tools").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      if (b.dataset.act === "ics") { exportCalendar(); toast("Kalenderdatei erstellt"); }
      else shareTrip();
    });
    const H = TRIP.hotel;
    $("#hotel").innerHTML = H
      ? `<div class="row has-tile"><div class="tile">${ic("bed-double")}</div>
          <div class="main"><div class="title">${esc(H.name)}</div><div class="text">${esc(H.address)}</div>
          <div class="acts" style="margin-top:10px">${ext(mapsRoute(H), "Route", "route", "btn btn-fill")}${ext(H.url, "Website", "globe")}</div></div></div>`
      : `<div class="row has-tile"><div class="tile" style="--c:#8E8E93">${ic("bed-double")}</div>
          <div class="main"><div class="title">Noch nicht eingetragen</div><div class="text">Entfernungen gelten bis dahin ${esc(TRIP.base.label)}.</div></div></div>`;

    const checks = store.get("checks", {});
    $("#checklists").innerHTML = CHECKLISTS.map((l) => `<div data-list="${esc(l.id)}">
      <div class="check-head"><div class="group-label">${esc(l.title)}</div><span class="muted" data-progress></span></div>
      <div class="list">${l.items.map((it) => {
        const key = l.id + "." + it.id;
        return `<label class="row check"><input type="checkbox" data-key="${esc(key)}" ${checks[key] ? "checked" : ""}><span>${esc(it.text)}</span></label>`;
      }).join("")}</div></div>`).join("");
    const progress = () => document.querySelectorAll("[data-list]").forEach((box) => {
      const all = box.querySelectorAll("input").length, done = box.querySelectorAll("input:checked").length;
      box.querySelector("[data-progress]").textContent = done === all ? "Alles erledigt" : `${done} von ${all}`;
    });
    $("#checklists").addEventListener("change", (e) => {
      const k = e.target.dataset.key; if (!k) return;
      const c = store.get("checks", {});
      e.target.checked ? (c[k] = true) : delete c[k];
      store.set("checks", c);
      progress();
    });
    progress();

    $("#infolist").innerHTML = INFOS.map((i) =>
      `<div class="row has-tile info-row"><div class="tile">${ic(i.icon)}</div><div class="main"><div class="title">${esc(i.title)}</div><div class="text">${esc(i.text)}</div></div></div>`).join("");
  }

  // ---------- Reiter (über die Adresse: #plan, #entdecken, #entdecken/<ort>, #infos, #tag-3) ----------
  const TABS = ["plan", "entdecken", "infos"];
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const [first, arg] = h.split("/");
    const tab = TABS.includes(first) ? first : "plan";
    TABS.forEach((t) => {
      $("#" + t).hidden = t !== tab;
      $("#tab-" + t).setAttribute("aria-selected", String(t === tab));
    });
    if (tab === "entdecken") {
      ensureMap().then(() => { if (arg) showOnMap(arg); })
        .catch(() => { $("#map").innerHTML = `<div class="empty">Karte konnte nicht geladen werden.</div>`; });
    }
    if (first.startsWith("tag-")) $("#" + first)?.scrollIntoView({ block: "start" });
    else if (!arg) window.scrollTo({ top: 0 });
    store.set("tab", tab);
  }
  function initTabs() {
    TABS.forEach((t) => $("#tab-" + t).addEventListener("click", () => {
      if (location.hash === "#" + t) route(); else location.hash = t;
    }));
    $(".tablist").addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const cur = TABS.findIndex((t) => $("#tab-" + t).getAttribute("aria-selected") === "true");
      const next = TABS[(cur + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
      location.hash = next; $("#tab-" + next).focus();
    });
    window.addEventListener("hashchange", route);
    if (!location.hash) history.replaceState(null, "", "#" + store.get("tab", "plan"));
    route();
  }

  // ---------- Start ----------
  renderHeader();
  renderFacts();
  renderNow();
  renderDays();
  if (dayIndex(TRIP) >= 0 && dayIndex(TRIP) < DAYS.length) setInterval(() => { renderNow(); renderDays(); }, 60e3);
  initDiscover();
  renderInfos();
  initTabs();
  initWeather();
  registerSW();
})();
