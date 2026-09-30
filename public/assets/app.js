/* Reiseplan-App: Plan, Entdecken (Karte + Liste), Infos. Daten kommen aus data.js. */
(() => {
  "use strict";
  const { TRIP, DAYS, PLACES, CATS, CHECKLISTS, INFOS, IMAGES } = window;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("irland." + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("irland." + k, JSON.stringify(v)); } catch { /* privat/voll */ } }
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
  const fmtKm = (d) => d < 1 ? `${Math.round(d * 1000 / 10) * 10} m` : `${d.toFixed(1).replace(".", ",")} km`;
  const walk = (d) => { const m = Math.round(d * 13); return m < 60 ? `${Math.max(m, 1)} Min.` : `${Math.floor(m / 60)} Std. ${m % 60} Min.`; };
  const mapsSearch = (p) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.name + " Dublin");
  const mapsRoute = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`;
  const ext = (url, label, cls = "btn btn-sm") => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`;

  // ---------- Reisezeitraum ----------
  const DAY_MS = 864e5;
  const startDate = new Date(TRIP.start + "T00:00:00");
  function tripDayIndex(now = new Date()) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((today - startDate) / DAY_MS);
  }

  function renderHeader() {
    $("#title").textContent = TRIP.title;
    $("#subtitle").textContent = TRIP.subtitle;
    const i = tripDayIndex();
    let s = "";
    if (i < 0) s = i === -1 ? "✈️ Morgen geht’s los" : `⏳ Noch ${-i} Tage`;
    else if (i < DAYS.length) s = `📍 Heute: Tag ${i + 1} von ${DAYS.length}`;
    else s = "✓ Reise abgeschlossen";
    $("#status").textContent = s;
  }

  // ---------- Plan ----------
  function renderFacts() {
    $("#facts").innerHTML = TRIP.facts.map((f) =>
      `<div class="card fact"><div class="label">${esc(f.label)}</div><div class="value">${esc(f.value)}</div></div>`).join("");
    $("#cost").textContent = TRIP.cost;
  }

  function renderDays() {
    const today = tripDayIndex();
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

    $("#daynav").innerHTML = DAYS.map((d, i) =>
      `<a href="#tag-${i + 1}" class="${i === today ? "is-today" : ""}"><b>${i + 1}</b>${esc(d.date.split(" ")[0])}</a>`).join("");

    $("#days").innerHTML = DAYS.map((d, i) => {
      const isToday = i === today;
      const nowIdx = isToday ? d.stops.reduce((acc, s, j) => (s.time <= hhmm ? j : acc), -1) : -1;
      const img = d.image && IMAGES[d.image];
      const pills = [
        isToday ? `<span class="pill today">Heute</span>` : "",
        d.tip ? `<span class="pill">${esc(d.tip)}</span>` : "",
        d.ni ? `<span class="pill warn">🇬🇧 Nordirland: Pass & £</span>` : ""
      ].join("");
      const stops = d.stops.map((s, j) => {
        const place = s.place && byId[s.place];
        const acts = [
          ...(s.links || []).map((l) => ext(l.url, l.label)),
          place && hasPos(place) ? `<a class="btn btn-sm" href="#entdecken/${esc(place.id)}">🗺️ Karte</a>` : ""
        ].join("");
        const cls = isToday ? (j === nowIdx ? "is-now" : j < nowIdx ? "is-past" : "") : "";
        return `<li class="stop ${cls}">
          <div class="time">${esc(s.time)}</div>
          <div class="body"><div class="txt">${esc(s.icon)} ${esc(s.text)}</div><div class="acts">${acts}</div></div>
        </li>`;
      }).join("");
      return `<article class="card day ${isToday ? "is-today" : ""}" id="tag-${i + 1}">
        ${img ? `<div class="day-img"><img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy" decoding="async" width="960" height="420"><a href="${esc(img.page)}" target="_blank" rel="noopener">Foto: Wikimedia</a></div>` : ""}
        <div class="day-head">
          <div class="day-num">${i + 1}</div>
          <div><div class="day-date">${esc(d.date)}</div><h3 class="day-title">${esc(d.title)}</h3><div class="pills">${pills}</div></div>
        </div>
        <ol class="timeline">${stops}</ol>
      </article>`;
    }).join("");

    // Wikimedia-Vorschau fehlt (z. B. offline) → Bildbereich ausblenden
    document.querySelectorAll(".day-img img").forEach((im) => im.addEventListener("error", () => im.parentElement.remove(), { once: true }));
  }

  // ---------- Wetter (Open-Meteo) ----------
  const WX_ICONS = [[[0], "☀️", "Sonnig"], [[1, 2], "🌤️", "Heiter"], [[3], "☁️", "Bewölkt"], [[45, 48], "🌫️", "Nebel"],
    [[51, 53, 55, 56, 57], "🌦️", "Niesel"], [[61, 63, 65, 66, 67, 80, 81, 82], "🌧️", "Regen"],
    [[71, 73, 75, 77, 85, 86], "🌨️", "Schnee"], [[95, 96, 99], "⛈️", "Gewitter"]];
  const wxIcon = (c) => (WX_ICONS.find(([codes]) => codes.includes(c)) || [null, "🌡️", ""]).slice(1);

  function drawWeather(data, stamp) {
    const d = data.daily;
    $("#weather").innerHTML = d.time.map((t, i) => {
      const [icon, label] = wxIcon(d.weather_code[i]);
      const day = new Date(t + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" });
      return `<div class="card wx" title="${esc(label)}">
        <div class="d">${esc(day)}</div><div class="i" aria-label="${esc(label)}">${icon}</div>
        <div class="t">${Math.round(d.temperature_2m_max[i])}° <span>${Math.round(d.temperature_2m_min[i])}°</span></div>
        <div class="r">💧 ${d.precipitation_probability_max[i] ?? "–"} % · 💨 ${Math.round(d.wind_speed_10m_max[i])}</div>
      </div>`;
    }).join("");
    $("#wxUpdated").textContent = "Stand " + new Date(stamp).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  async function initWeather() {
    const cached = store.get("wx");
    if (cached) drawWeather(cached.data, cached.at);
    const url = "https://api.open-meteo.com/v1/forecast?latitude=53.35&longitude=-6.26&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&wind_speed_unit=kmh&timezone=Europe%2FDublin&forecast_days=7";
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const at = Date.now();
      store.set("wx", { data, at });
      drawWeather(data, at);
    } catch {
      if (!cached) {
        $("#weather").innerHTML = `<div class="wx-empty card">Keine Verbindung – Wetter später noch einmal laden.</div>`;
        $("#wxUpdated").textContent = "offline";
      }
    }
  }

  // ---------- Entdecken ----------
  const state = { cats: new Set(), q: "", near: false, sort: "cat", me: null, focus: null };
  let map = null, layer = null, markers = {}, meMarker = null;

  const refPoint = () => state.me || TRIP.hotel;
  const refLabel = () => state.me ? "von dir" : "vom Hotel";
  const catsOf = (p) => p.cats.map((c) => CATS[c]).filter(Boolean);
  const searchText = (p) => [p.name, p.note, p.kind, p.price, ...catsOf(p).map((c) => c.label), p.free ? "frei kostenlos gratis" : ""].join(" ").toLowerCase();
  PLACES.forEach((p) => { p._s = searchText(p); });

  function visiblePlaces() {
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    return PLACES.filter((p) =>
      (state.cats.size === 0 || p.cats.some((c) => state.cats.has(c))) &&
      terms.every((t) => p._s.includes(t)) &&
      (!state.near || (hasPos(p) && km(TRIP.hotel, p) <= 2)));
  }

  function renderChips() {
    const chips = [`<button class="chip" type="button" data-cat="" aria-pressed="true">Alle</button>`]
      .concat(Object.entries(CATS).map(([k, c]) =>
        `<button class="chip" type="button" data-cat="${k}" aria-pressed="false" style="--c:${c.color}"><span class="dot"></span>${c.icon} ${esc(c.label)}</button>`));
    $("#chips").innerHTML = chips.join("");
    $("#chips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      const cat = b.dataset.cat;
      if (!cat) state.cats.clear();
      else state.cats.has(cat) ? state.cats.delete(cat) : state.cats.add(cat);
      $("#chips").querySelectorAll(".chip").forEach((c) =>
        c.setAttribute("aria-pressed", String(c.dataset.cat ? state.cats.has(c.dataset.cat) : state.cats.size === 0)));
      refresh();
    });
  }

  function placeCard(p) {
    const cat = CATS[p.cats[0]];
    const d = hasPos(p) ? km(refPoint(), p) : null;
    const meta = [
      p.rating ? `<span class="star">★ ${String(p.rating).replace(".", ",")}</span>` : "",
      p.kind ? esc(p.kind) : "", p.price ? `<b>${esc(p.price)}</b>` : "",
      d !== null ? `${fmtKm(d)} ${refLabel()}${d < 4 ? ` · 🚶 ${walk(d)}` : ""}` : ""
    ].filter(Boolean).join(" · ");
    const acts = [
      hasPos(p) ? `<button class="btn btn-sm" type="button" data-show="${esc(p.id)}">🗺️ Karte</button>` : "",
      hasPos(p) ? ext(mapsRoute(p), "Route") : "",
      p.url ? ext(p.url, "Website") : ext(mapsSearch(p), "Google Maps")
    ].join("");
    return `<article class="card place ${state.focus === p.id ? "is-focus" : ""}" id="p-${esc(p.id)}" style="--c:${cat.color}">
      <div>
        <div class="top"><div class="name">${esc(p.name)}${p.free ? `<span class="free">FREI</span>` : ""}</div></div>
        ${meta ? `<div class="meta">${meta}</div>` : ""}
        ${p.note ? `<div class="note">${esc(p.note)}</div>` : ""}
        <div class="acts">${acts}</div>
      </div>
    </article>`;
  }

  function renderList(list) {
    $("#count").textContent = `${list.length} ${list.length === 1 ? "Ort" : "Orte"}${state.near ? " im Umkreis von 2 km um das Hotel" : ""}`;
    if (!list.length) { $("#list").innerHTML = `<div class="empty card">Nichts gefunden. Filter zurücksetzen?</div>`; return; }
    if (state.sort === "cat") {
      const groups = {};
      list.forEach((p) => {
        const g = p.cats.find((c) => state.cats.has(c)) || p.cats[0];
        (groups[g] ||= []).push(p);
      });
      $("#list").innerHTML = Object.keys(CATS).filter((k) => groups[k]).map((k) =>
        `<h3 class="group-title">${CATS[k].icon} ${esc(CATS[k].label)} <span class="muted">${groups[k].length}</span></h3>
         <div class="places">${groups[k].map(placeCard).join("")}</div>`).join("");
    } else {
      const sorted = [...list].sort(state.sort === "dist"
        ? (a, b) => (hasPos(a) ? km(refPoint(), a) : 1e9) - (hasPos(b) ? km(refPoint(), b) : 1e9)
        : (a, b) => (b.rating || 0) - (a.rating || 0));
      $("#list").innerHTML = `<div class="places">${sorted.map(placeCard).join("")}</div>`;
    }
  }

  function popupHtml(p) {
    const cats = catsOf(p).map((c) => c.icon + " " + c.label).join(" · ");
    const d = km(refPoint(), p);
    return `<b>${esc(p.name)}</b><div class="muted">${esc(cats)}${p.rating ? ` · ★ ${String(p.rating).replace(".", ",")}` : ""}</div>
      ${p.note ? `<div>${esc(p.note)}</div>` : ""}
      <div class="muted">${fmtKm(d)} ${refLabel()} · 🚶 ${walk(d)}</div>
      <div class="acts">${ext(mapsRoute(p), "Route", "btn btn-sm btn-primary")}${p.url ? ext(p.url, "Website") : ""}</div>`;
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

  function tileUrl() {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    return `https://{s}.basemaps.cartocdn.com/rastertiles/${dark ? "dark_all" : "voyager"}/{z}/{x}/{y}{r}.png`;
  }

  function initMap() {
    if (map || !window.L) return;
    map = L.map("map", { scrollWheelZoom: false, zoomControl: false }).setView([53.3455, -6.2635], 14);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const tiles = L.tileLayer(tileUrl(), {
      subdomains: "abcd", maxZoom: 19, detectRetina: false,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => tiles.setUrl(tileUrl()));
    map.attributionControl.setPrefix(false);

    layer = L.layerGroup().addTo(map);
    PLACES.filter(hasPos).forEach((p) => {
      const color = CATS[p.cats[0]].color;
      const m = L.circleMarker([p.lat, p.lng], { radius: 8, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 })
        .bindPopup(popupHtml(p), { maxWidth: 260 })
        .bindTooltip(p.name, { direction: "top", offset: [0, -6] });
      m.on("popupopen", () => highlight(p.id));
      markers[p.id] = m;
    });

    const H = TRIP.hotel;
    L.marker([H.lat, H.lng], {
      title: H.name, zIndexOffset: 1000,
      icon: L.divIcon({ className: "", html: `<div class="pin-hotel"><span>🏨</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] })
    }).addTo(map).bindPopup(`<b>${esc(H.name)}</b><div class="muted">${esc(H.address)}</div><div class="acts">${ext(H.url, "Website")}</div>`);

    refresh();
  }

  function highlight(id) {
    state.focus = id;
    document.querySelectorAll(".place.is-focus").forEach((e) => e.classList.remove("is-focus"));
    $("#p-" + CSS.escape(id))?.classList.add("is-focus");
  }

  function showOnMap(id) {
    const p = byId[id]; if (!p || !hasPos(p)) return;
    // Ort sichtbar machen, falls er gerade herausgefiltert ist
    if (!visiblePlaces().some((x) => x.id === id)) {
      state.cats.clear(); state.q = ""; state.near = false;
      $("#q").value = ""; $("#nearBtn").setAttribute("aria-pressed", "false");
      $("#chips").querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(!c.dataset.cat)));
      refresh();
    }
    highlight(id);
    $("#map").scrollIntoView({ behavior: "smooth", block: "start" });
    map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16), { animate: true });
    markers[id].openPopup();
  }

  function locate() {
    const btn = $("#locateBtn");
    if (!navigator.geolocation) { btn.textContent = "📍 Nicht verfügbar"; return; }
    btn.textContent = "📍 Suche …";
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      state.me = { lat, lng };
      if (!meMarker) {
        meMarker = L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<div class="pin-me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 900 })
          .addTo(map).bindPopup(`Du bist hier (± ${Math.round(accuracy)} m)`);
      } else meMarker.setLatLng([lat, lng]);
      map.setView([lat, lng], Math.max(map.getZoom(), 15));
      btn.textContent = "📍 Standort aktiv";
      btn.setAttribute("aria-pressed", "true");
      refresh();
    }, () => { btn.textContent = "📍 Kein Zugriff"; setTimeout(() => (btn.textContent = "📍 Mein Standort"), 2500); },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  function initDiscover() {
    renderChips();
    let t;
    $("#q").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); refresh(); }, 120); });
    $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; refresh(); });
    $("#nearBtn").addEventListener("click", (e) => {
      state.near = !state.near;
      e.currentTarget.setAttribute("aria-pressed", String(state.near));
      if (map) state.near ? map.setView([TRIP.hotel.lat, TRIP.hotel.lng], 15) : null;
      refresh();
    });
    $("#locateBtn").addEventListener("click", locate);
    $("#list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-show]");
      if (b) showOnMap(b.dataset.show);
    });
    refresh();
  }

  // ---------- Infos ----------
  function renderInfos() {
    const H = TRIP.hotel;
    $("#hotel").innerHTML = `<div><div class="muted" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Hotel</div>
      <div style="font-weight:600">${esc(H.name)}</div><div class="muted" style="font-size:14px">${esc(H.address)}</div></div>
      <div class="acts">${ext(mapsRoute(H), "Route", "btn btn-sm btn-primary")}${ext(H.url, "Website")}</div>`;

    const checks = store.get("checks", {});
    $("#checklists").innerHTML = CHECKLISTS.map((l) => `<div class="card" data-list="${esc(l.id)}">
      <div class="check-head"><h3>${esc(l.title)}</h3><span class="muted" data-progress></span></div>
      <div class="progress"><i></i></div>
      <ul class="checklist">${l.items.map((it) => {
        const key = l.id + "." + it.id;
        return `<li><label><input type="checkbox" data-key="${esc(key)}" ${checks[key] ? "checked" : ""}><span>${esc(it.text)}</span></label></li>`;
      }).join("")}</ul></div>`).join("");
    const progress = () => document.querySelectorAll("[data-list]").forEach((box) => {
      const all = box.querySelectorAll("input"), done = box.querySelectorAll("input:checked");
      box.querySelector("[data-progress]").textContent = `${done.length}/${all.length}`;
      box.querySelector(".progress i").style.width = (done.length / all.length * 100) + "%";
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
      `<div class="card info"><div class="ic" aria-hidden="true">${i.icon}</div><div><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div></div>`).join("");
  }

  // ---------- Tabs (über die Adresse: #plan, #entdecken, #entdecken/<ort>, #infos, #tag-3) ----------
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
      initMap();
      requestAnimationFrame(() => map && map.invalidateSize());
      if (arg) setTimeout(() => showOnMap(arg), 50);
    }
    if (first.startsWith("tag-")) $("#" + first)?.scrollIntoView({ block: "start" });
    else if (!arg) window.scrollTo({ top: 0 });
    store.set("tab", tab);
  }
  function initTabs() {
    TABS.forEach((t) => $("#tab-" + t).addEventListener("click", () => {
      if (location.hash === "#" + t) route(); else location.hash = t;
    }));
    // Pfeiltasten in der Tab-Leiste
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
  renderDays();
  initDiscover();
  renderInfos();
  initTabs();
  initWeather();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
})();
