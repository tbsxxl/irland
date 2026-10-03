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
  const pad = (n) => String(n).padStart(2, "0");
  const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat/voll */ } };

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

  // ---------- Buchungen: aus der Reisedatei (TRIP.bookings) und selbst eingetragen (localStorage „<id>.bookings“) ----------
  const BOOK_TYPES = { flight: ["Flug", "plane"], hotel: ["Hotel", "bed-double"], train: ["Zug & Bus", "train-front"],
    car: ["Mietwagen", "car"], ticket: ["Ticket", "ticket"], other: ["Sonstiges", "pencil"] };
  const bookingsOf = (trip) => [...(trip.bookings || []).map((b, i) => ({ ...b, id: "fix" + i, fixed: true })), ...lsGet(trip.id + ".bookings", [])]
    .filter((b) => b && /^\d{4}-\d\d-\d\d$/.test(b.date))
    .sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")));
  const nextBooking = (trip) => { const today = isoDay(new Date()); return bookingsOf(trip).find((b) => b.date >= today); };
  function bookingWhen(b) {
    const diff = Math.round((dateOf(b.date) - dateOf(isoDay(new Date()))) / DAY_MS);
    const day = diff === 0 ? "Heute" : diff === 1 ? "Morgen" : dateOf(b.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "numeric" });
    return day + (b.time ? " um " + b.time : "");
  }
  const bookingLabel = (b) => `${(BOOK_TYPES[b.type] || BOOK_TYPES.other)[0]}${b.title ? ": " + b.title : ""}`;
  // Status-Zeile: Buchung heute/morgen hat Vorrang vor dem Countdown
  function bookingStatus(trip) {
    const b = nextBooking(trip);
    if (!b || Math.round((dateOf(b.date) - dateOf(isoDay(new Date()))) / DAY_MS) > 1) return null;
    return { icon: (BOOK_TYPES[b.type] || BOOK_TYPES.other)[1], text: `${bookingWhen(b)} · ${bookingLabel(b)}` };
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

  const ext = (url, label, icon = "arrow-up-right", cls = "btn") =>
    `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${ic(icon)}${esc(label)}</a>`;

  // ---------- Hinweis unten (Toast) ----------
  function toast(text) {
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = text;
    document.body.append(t);
    setTimeout(() => t.classList.add("out"), 1800);
    setTimeout(() => t.remove(), 2200);
  }

  // ---------- Karte: Leaflet wird erst bei Bedarf geladen, Kacheln von CARTO ----------
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
  const tiles = () => L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'
  });

  // ---------- Detailblatt (allgemein): von unten, schließt per ×, Hintergrund, Wischen, Escape oder Zurück ----------
  let sheetFrom = null, sheetHistory = false;
  function showSheet(html) {
    $("#sheetBody").innerHTML = html;
    const sheet = $("#sheet"), panel = $(".sheet-panel");
    sheetFrom = document.activeElement;
    sheet.hidden = false;
    panel.scrollTop = 0;
    requestAnimationFrame(() => sheet.classList.add("is-open"));
    document.documentElement.classList.add("has-sheet");
    observeWiki($("#sheetBody"));
    panel.focus({ preventScroll: true });
    if (!sheetHistory) { history.pushState({ sheet: 1 }, ""); sheetHistory = true; }
  }
  function closeSheet(fromHistory = false) {
    const sheet = $("#sheet");
    if (sheet.hidden) return;
    sheet.classList.remove("is-open");
    document.documentElement.classList.remove("has-sheet");
    setTimeout(() => { sheet.hidden = true; $(".sheet-panel").style.transform = ""; }, 260);
    if (sheetHistory && !fromHistory) { sheetHistory = false; history.back(); }
    sheetHistory = false;
    sheetFrom && sheetFrom.focus && sheetFrom.focus({ preventScroll: true });
  }
  function initSheet(onClick) {
    const sheet = $("#sheet"), panel = $(".sheet-panel");
    sheet.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) return closeSheet();
      onClick && onClick(e);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
    window.addEventListener("popstate", () => { if (sheetHistory) { sheetHistory = false; closeSheet(true); } });
    let y0 = null, dy = 0;
    panel.addEventListener("touchstart", (e) => { if (panel.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
    panel.addEventListener("touchmove", (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      panel.style.transform = dy ? `translateY(${dy}px)` : "";
    }, { passive: true });
    panel.addEventListener("touchend", () => {
      if (y0 === null) return;
      y0 = null;
      if (dy > 90) closeSheet(); else panel.style.transform = "";
    });
  }

  // ---------- Kompakte Titelleiste: erscheint, sobald die große Überschrift aus dem Bild ist ----------
  function initNavbar(title, back) {
    $("#navTitle").textContent = title;
    $("#navBack").hidden = !back;
    const bar = $("#navbar");
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(([e]) => {
      const show = !e.isIntersecting && e.boundingClientRect.top < 0;
      bar.classList.toggle("is-visible", show);
      bar.setAttribute("aria-hidden", String(!show));
    }).observe($(".top h1"));
  }

  // ---------- Übersicht aller Reisen ----------
  // Gemerkte Ziele aus der Inspiration als schmale Leiste auf der Übersicht
  function ideasHtml() {
    const favs = new Set(lsGet("inspo.favs", []));
    const list = (window.INSPIRATION || []).filter((d) => favs.has(d.id));
    if (!list.length) return "";
    return `<div class="section"><div class="group-label">Gemerkte Ideen</div><div class="idea-row">${list.map((d) =>
      `<a class="idea" href="#inspiration/${esc(d.id)}">${wikiSlot(d.wiki, "cover-photo", "thumb")}<div class="t">${esc(d.name)}</div><div class="m">${esc(d.country)}</div></a>`).join("")}
      <a class="idea-more" href="#inspiration">Alle Ideen</a></div></div>`;
  }
  function renderHubList() {
    const order = { now: 0, soon: 1, past: 2 };
    const list = TRIPS.map((t) => ({ t, st: tripStatus(t) }))
      .sort((a, b) => order[a.st.kind] - order[b.st.kind] ||
        (a.st.kind === "past" ? b.t.start.localeCompare(a.t.start) : a.t.start.localeCompare(b.t.start)));
    const next = list.find((x) => x.st.kind !== "past");
    $("#subtitle").textContent = `${TRIPS.length} ${TRIPS.length === 1 ? "Reise" : "Reisen"} · Pläne, Karten & Checklisten`;
    setStatus(next && (bookingStatus(next.t) || (next.st.kind === "now"
      ? { icon: "map-pin", text: `Unterwegs: ${next.t.title}` }
      : { icon: "plane", text: `${next.t.title} in ${next.st.days} ${next.st.days === 1 ? "Tag" : "Tagen"}` })));

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
        ${t.mine ? `<span>${ic("pencil")}Entwurf</span>` : ""}
        <span class="go">${ic("chevron-right")}</span>
      </div>
    </a>`;
    const upcoming = list.filter((x) => x.st.kind !== "past"), past = list.filter((x) => x.st.kind === "past");
    $("#hubList").innerHTML = !list.length ? `<div class="card empty">Noch keine Reise angelegt.</div>` : [
      upcoming.length ? `<div class="section"><div class="group-label">Anstehend</div><div class="hub-list">${upcoming.map(card).join("")}</div></div>` : "",
      ideasHtml(),
      past.length ? `<div class="section"><div class="group-label">Vergangen</div><div class="hub-list">${past.map(card).join("")}</div></div>` : ""
    ].join("");
    observeWiki($("#hubList"));
  }
  function renderHub() {
    renderHubList();
    initNavbar("Reisen", false);
    registerSW();
  }

  // ---------- Inspiration: andere mögliche Ziele (assets/inspiration.js) ----------
  const INSPO = window.INSPIRATION || [];
  const INSPO_MONTHS = window.INSPIRATION_MONTHS || {};
  const INSPO_TAGS = { strand: ["Strand", "waves"], kultur: ["Kultur & Geschichte", "landmark"], stadt: ["Großstadt", "building-2"],
    natur: ["Natur", "mountain"], essen: ["Essen & Trinken", "utensils"], nacht: ["Nachtleben", "moon"] };
  const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const SORTS = { tip: "Empfohlen", warm: "Wärmste", price: "Günstig", flight: "Kurzer Flug" };
  const DIST = { "": "Alle", near: "bis 3 Std.", mid: "3–7 Std.", far: "Fernreise" };
  const FAR = 7;              // ab 7 Std. Flug = Fernreise
  const BUDGET_MAX = 20000;   // Regler ganz rechts = egal
  const saved = lsGet("inspo.prefs", {});
  const clampInt = (v, lo, hi, d) => { v = Number(v); return Number.isInteger(v) && v >= lo && v <= hi ? v : d; };
  const inspo = { q: "", tag: "", warm: false, fav: false, tip: false, dry: false,
    dist: ["near", "mid", "far"].includes(saved.dist) ? saved.dist : "", budget: clampInt(saved.budget, 500, BUDGET_MAX, BUDGET_MAX),
    sort: SORTS[saved.sort] ? saved.sort : "tip",
    // Reisegruppe für alle Preise: Personen (Doppelzimmer je 2), Nächte, optional Ausgaben vor Ort
    pax: clampInt(saved.pax, 1, 8, 2), nights: clampInt(saved.nights, 2, 21, 7), spend: !!saved.spend,
    view: lsGet("inspo.view", "list") === "map" ? "map" : "list",
    // Reisemonat (0–11): zuletzt gewählter, sonst der nächste Monat
    month: (() => { const m = Number(lsGet("inspo.month", NaN)); return Number.isInteger(m) && m >= 0 && m < 12 ? m : (new Date().getMonth() + 1) % 12; })(),
    favs: new Set(lsGet("inspo.favs", [])) };
  const tempClass = (t) => t >= 20 ? "hot" : t >= 13 ? "mild" : "cold";
  const tempIcon = (t) => t >= 20 ? "sun" : t >= 13 ? "cloud-sun" : t >= 3 ? "cloud" : "cloud-snow";
  const flightText = (h) => `${String(h).replace(".5", "½").replace(".25", "¼")} Std. Flug`;
  const tempOf = (d, m = inspo.month) => d.temps[m];
  const tipOf = (d, m = inspo.month) => INSPO_MONTHS[m + 1]?.[d.id];
  const tipRank = (d) => { const i = Object.keys(INSPO_MONTHS[inspo.month + 1] || {}).indexOf(d.id); return i < 0 ? 99 : i; };
  const fmtEuro = (n) => n.toLocaleString("de-DE") + " €";
  const euro = (a, b) => `${a.toLocaleString("de-DE")}–${fmtEuro(b)}`;
  const savePrefs = () => lsSet("inspo.prefs", { pax: inspo.pax, nights: inspo.nights, spend: inspo.spend, sort: inspo.sort, dist: inspo.dist, budget: inspo.budget });
  // Ausgaben vor Ort (Essen, Nahverkehr, Eintritte) pro Person und Tag: grob aus dem Hotel-Preisniveau geschätzt
  const dailySpend = (d) => d.daily || [Math.round(d.hotel[0] * 0.5 / 5) * 5, Math.round(d.hotel[1] * 0.6 / 5) * 5];
  const r50 = (x) => Math.round(x / 50) * 50;
  // Reisekosten für die gewählte Gruppe: Zimmer = Personen/2 aufgerundet, Flug pro Person, auf 50 € gerundet
  function tripCost(d, pax = inspo.pax, nights = inspo.nights, spend = inspo.spend) {
    const rooms = Math.ceil(pax / 2), sp = dailySpend(d);
    const hotel = d.hotel.map((x) => x * rooms * nights), fly = d.fly.map((x) => x * pax);
    const local = spend ? sp.map((x) => x * pax * nights) : [0, 0];
    const total = [0, 1].map((i) => r50(hotel[i] + fly[i] + local[i]));
    return { rooms, hotel: hotel.map(r50), fly: fly.map(r50), local: local.map(r50), daily: sp, total, perPax: total.map((x) => r50(x / pax)) };
  }
  const groupText = (pax = inspo.pax, nights = inspo.nights) => `${pax} ${pax === 1 ? "Person" : "Personen"} · ${nights} Nächte`;
  const groupShort = () => `${inspo.pax} P. · ${inspo.nights} N.`;
  const offSeason = (d) => d.off && [10, 11, 0, 1, 2].includes(inspo.month);
  const rainy = (d, m = inspo.month) => !!d.rain?.includes(m + 1);
  const distOk = (d) => !inspo.dist || (inspo.dist === "near" ? d.flight <= 3 : inspo.dist === "mid" ? d.flight > 3 && d.flight < FAR : d.flight >= FAR);
  const shortName = (d) => d.name.replace(/ \(.*\)/, "");

  function inspoVisible() {
    const terms = fold(inspo.q).split(/\s+/).filter(Boolean);
    const list = INSPO.filter((d) => {
      const text = fold([d.name, d.country, d.pitch, ...d.highlights, ...d.tags.map((t) => INSPO_TAGS[t]?.[0]), tipOf(d) || ""].join(" "));
      return terms.every((t) => text.includes(t)) && (!inspo.tag || d.tags.includes(inspo.tag)) &&
        (!inspo.warm || tempOf(d) >= 20) && (!inspo.fav || inspo.favs.has(d.id)) && (!inspo.tip || tipOf(d)) &&
        (!inspo.dry || !rainy(d)) && distOk(d) && (inspo.budget >= BUDGET_MAX || tripCost(d).total[0] <= inspo.budget);
    });
    // Empfohlen: Monatstipps in ihrer Reihenfolge, danach angenehmstes Wetter (nahe 25 °C, Regenzeit hinten)
    const comfort = (d) => Math.abs(tempOf(d) - 25) + (rainy(d) ? 8 : 0);
    const by = {
      tip: (a, b) => tipRank(a) - tipRank(b) || comfort(a) - comfort(b) || a.flight - b.flight,
      warm: (a, b) => tempOf(b) - tempOf(a) || a.flight - b.flight,
      price: (a, b) => { const x = tripCost(a).total, y = tripCost(b).total; return x[0] + x[1] - y[0] - y[1] || a.flight - b.flight; },
      flight: (a, b) => a.flight - b.flight || tempOf(b) - tempOf(a)
    };
    return list.sort(by[inspo.sort]);
  }
  // Aktive Filter als Chips unter der Leiste (antippen = entfernen)
  const activeFilters = () => [
    inspo.tip && ["tip", `Tipps im ${MONTHS[inspo.month]}`], inspo.fav && ["fav", "Gemerkt"], inspo.warm && ["warm", "Warm ab 20°"],
    inspo.dry && ["dry", "Ohne Regenzeit"], inspo.dist && ["dist", "Flug " + DIST[inspo.dist]],
    inspo.budget < BUDGET_MAX && ["budget", `Bis ${fmtEuro(inspo.budget)}`], inspo.tag && ["tag", INSPO_TAGS[inspo.tag][0]]
  ].filter(Boolean);
  function clearFilter(k) {
    if (k === "all") Object.assign(inspo, { tip: false, fav: false, warm: false, dry: false, dist: "", budget: BUDGET_MAX, tag: "" });
    else inspo[k] = k === "budget" ? BUDGET_MAX : k === "dist" || k === "tag" ? "" : false;
    savePrefs();
  }

  function inspoCard(d) {
    const t = tempOf(d), tip = tipOf(d), c = tripCost(d);
    return `
      <article class="inspo-card" data-inspo="${esc(d.id)}" role="button" tabindex="0" aria-label="${esc(d.name)} – Details">
        <div class="inspo-photo">${wikiSlot(d.wiki, "cover-photo", "large")}
          <span class="temp ${tempClass(t)}">${ic(tempIcon(t))}${t}°</span>
          <button class="fav inspo-fav" type="button" data-inspo-fav="${esc(d.id)}" aria-pressed="${inspo.favs.has(d.id)}" aria-label="${esc(d.name)} merken">${ic("heart")}</button>
        </div>
        <div class="inspo-body">
          <div class="inspo-name">${esc(d.name)}</div>
          <div class="inspo-meta">${esc(d.country)} · ${flightText(d.flight)}</div>
          ${tip ? `<p class="inspo-tip">${ic("sparkles")}${esc(tip)}</p>` : `<p class="inspo-pitch">${esc(d.pitch)}</p>`}
          <div class="inspo-foot">
            <span class="inspo-price" title="${esc(groupText())}: ${euro(...c.total)} (Hotel ${euro(...d.hotel)}/Nacht, Flug ${euro(...d.fly)} p. P.)">${ic("euro")}ab ${fmtEuro(c.total[0])}</span>
            ${rainy(d) ? `<span class="inspo-off rain">${ic("cloud-rain")}Regenzeit</span>` : offSeason(d) ? `<span class="inspo-off">${ic("info")}Nebensaison</span>` : ""}
          </div>
        </div>
      </article>`;
  }
  function renderInspo() {
    const list = inspoVisible(), act = activeFilters();
    $("#inspoMonthBtn span").textContent = MONTHS[inspo.month];
    const badge = $("#inspoFilterBtn .badge");
    badge.textContent = act.length; badge.hidden = !act.length;
    $("#inspoView").querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === inspo.view)));
    $("#inspoActive").innerHTML = [
      ...act.map(([k, label]) => `<button class="chip is-on" type="button" data-clear="${k}" aria-label="Filter ${esc(label)} entfernen">${esc(label)}${ic("x")}</button>`),
      act.length > 1 ? `<button class="chip" type="button" data-clear="all">Alle entfernen</button>` : "",
      inspo.favs.size >= 2 ? `<button class="chip chip-cmp" type="button" data-compare>${ic("columns-3")}Vergleichen (${inspo.favs.size})</button>` : ""
    ].join("");
    $("#inspoGroupBtn span").textContent = groupShort();
    $("#inspoCount").textContent = `${list.length} ${list.length === 1 ? "Ziel" : "Ziele"} · ${SORTS[inspo.sort]} · Höchstwerte im ${MONTHS[inspo.month]} · Preise gesamt für ${groupText()}${inspo.spend ? " inkl. vor Ort" : ""} (grobe Richtwerte)`;
    $("#inspoGrid").hidden = inspo.view !== "list";
    $("#inspoMapBox").hidden = inspo.view !== "map";
    if (inspo.view === "map") { $("#inspoGrid").innerHTML = ""; renderWorldMap(list); return; }
    $("#inspoGrid").innerHTML = list.length ? list.map(inspoCard).join("")
      : `<div class="card empty">Kein Ziel passt.${act.length ? ` <button class="btn" type="button" data-clear="all">Filter entfernen</button>` : ""}</div>`;
    observeWiki($("#inspoGrid"));
  }

  // ---------- Weltkarte: Temperatur im gewählten Monat als Marker ----------
  let wmap = null, wlayer = null, wkey = "";
  function renderWorldMap(list) {
    const box = $("#inspoMap");
    $("#inspoLegend").innerHTML = `Tageshöchstwerte im ${MONTHS[inspo.month]} · <span class="lg-tip">lila Rand</span> = Reisetipp · gestreift = Regenzeit · reinzoomen für Temperaturen`;
    (leafletLoading || loadLeaflet()).then(() => {
      if (!wmap) {
        wmap = L.map(box, { zoomControl: false, worldCopyJump: true, minZoom: 1, zoomSnap: 0.5 }).setView([30, 10], 2);
        L.control.zoom({ position: "bottomright" }).addTo(wmap);
        tiles().addTo(wmap);
        wmap.attributionControl.setPrefix(false).setPosition("bottomleft");
        wlayer = L.layerGroup().addTo(wmap);
        // Weit herausgezoomt nur Punkte (sonst überlappen die Temperaturen in Europa), ab Zoom 4 mit Zahl
        const dense = () => box.classList.toggle("is-far", wmap.getZoom() < 4);
        wmap.on("zoomend", dense); dense();
      }
      wmap.invalidateSize();
      wlayer.clearLayers();
      list.forEach((d) => {
        const t = tempOf(d), tip = tipOf(d);
        L.marker(d.ll, {
          title: d.name, riseOnHover: true, zIndexOffset: tip ? 500 : 0, keyboard: true,
          icon: L.divIcon({ className: "", html: `<div class="wpin ${tempClass(t)}${tip ? " tip" : ""}${rainy(d) ? " rain" : ""}${inspo.favs.has(d.id) ? " fav" : ""}">${t}°</div>`, iconSize: [38, 24], iconAnchor: [19, 12] })
        }).bindTooltip(`<b>${esc(d.name)}</b>${tip ? `<br>${esc(tip)}` : ""}`, { direction: "top", offset: [0, -12] })
          .on("click", () => openInspo(d.id)).addTo(wlayer);
      });
      // Ausschnitt nur anpassen, wenn sich die Auswahl geändert hat (nicht beim Monatswechsel)
      const key = list.map((d) => d.id).sort().join();
      if (key !== wkey && list.length) wmap.fitBounds(L.latLngBounds(list.map((d) => d.ll)).pad(0.05), { maxZoom: 5 });
      wkey = key;
    }).catch(() => { box.innerHTML = `<div class="empty">Karte konnte nicht geladen werden.</div>`; });
  }

  function setInspoMonth(m) {
    inspo.month = m;
    lsSet("inspo.month", m);
    renderInspo();
  }
  function toggleInspoFav(id) {
    const on = !inspo.favs.has(id);
    on ? inspo.favs.add(id) : inspo.favs.delete(id);
    lsSet("inspo.favs", [...inspo.favs]);
    document.querySelectorAll(`[data-inspo-fav="${CSS.escape(id)}"]`).forEach((b) => {
      b.setAttribute("aria-pressed", String(on));
      const label = b.querySelector("span"); if (label) label.textContent = on ? "Gemerkt" : "Merken";
    });
    renderInspo();
  }

  // ---------- Blätter: Monat, Filter, Vergleich ----------
  function openMonthSheet() {
    sheetMode = "month";
    showSheet(`<div class="sheet-content">
      <h2 id="sheetTitle">Reisemonat</h2>
      <p class="sheet-note">Temperaturen, Tipps und Regenzeiten gelten für den gewählten Monat.</p>
      <div class="month-grid">${MONTHS.map((name, m) => {
        const n = Object.keys(INSPO_MONTHS[m + 1] || {}).length;
        return `<button type="button" data-month-pick="${m}" aria-pressed="${m === inspo.month}"><b>${name}</b><small>${n} Tipps</small></button>`;
      }).join("")}</div>
    </div>`);
  }
  function filterSheetHtml() {
    const seg = (f, opts, cur) => `<div class="segmented seg-${Object.keys(opts).length}" data-f="${f}" role="group">${Object.entries(opts).map(([k, l]) =>
      `<button type="button" data-v="${k}" aria-pressed="${cur === k}">${esc(l)}</button>`).join("")}</div>`;
    const tog = (k, label, icon) => `<button class="chip" type="button" data-ft="${k}" aria-pressed="${!!inspo[k]}">${ic(icon)}${esc(label)}</button>`;
    return `<div class="sheet-content">
      <h2 id="sheetTitle">Filter &amp; Sortierung</h2>
      <h3 class="sheet-h">Sortieren nach</h3>${seg("sort", SORTS, inspo.sort)}
      <h3 class="sheet-h">Flugzeit ab Deutschland</h3>${seg("dist", DIST, inspo.dist)}
      <h3 class="sheet-h">Budget gesamt <b class="f-val" id="fBudgetVal"></b></h3>
      <input class="range" type="range" id="fBudget" min="500" max="${BUDGET_MAX}" step="250" value="${inspo.budget}" aria-label="Budget gesamt">
      <p class="inspo-fine">Für ${esc(groupText())}${inspo.spend ? " inkl. Ausgaben vor Ort" : ""}, günstiger Richtwert · <button class="link" type="button" data-group>Reisende ändern</button></p>
      <h3 class="sheet-h">Anzeigen</h3>
      <div class="chips wrap">
        ${tog("tip", `Tipps im ${MONTHS[inspo.month]}`, "sparkles")}${tog("fav", "Gemerkt", "heart")}
        ${tog("warm", "Warm ab 20°", "sun")}${tog("dry", "Ohne Regenzeit", "umbrella")}
      </div>
      <h3 class="sheet-h">Thema</h3>
      <div class="chips wrap">${Object.entries(INSPO_TAGS).map(([k, [label, icon]]) =>
        `<button class="chip" type="button" data-ftag="${k}" aria-pressed="${inspo.tag === k}">${ic(icon)}${esc(label)}</button>`).join("")}</div>
      <div class="sheet-acts">
        <button class="btn btn-lg" type="button" data-freset>Zurücksetzen</button>
        <button class="btn btn-fill btn-lg" type="button" data-close id="fShow"></button>
      </div>
    </div>`;
  }
  function syncFilterSheet() {
    const n = inspoVisible().length;
    $("#fShow").textContent = n ? `${n} ${n === 1 ? "Ziel" : "Ziele"} anzeigen` : "Kein Ziel passt";
    $("#fBudgetVal").textContent = inspo.budget >= BUDGET_MAX ? "egal" : "bis " + fmtEuro(inspo.budget);
  }
  function openFilterSheet() {
    sheetMode = "filter";
    showSheet(filterSheetHtml());
    syncFilterSheet();
  }
  function redrawFilterSheet() {
    const panel = $(".sheet-panel"), y = panel.scrollTop;
    $("#sheetBody").innerHTML = filterSheetHtml(); panel.scrollTop = y;
    syncFilterSheet(); renderInspo();
  }
  function openCompare() {
    const ds = INSPO.filter((d) => inspo.favs.has(d.id));
    if (ds.length < 2) return;
    sheetMode = "compare";
    const wk = Object.fromEntries(ds.map((d) => [d.id, tripCost(d).total]));
    const best = (fn, max) => { const v = ds.map(fn); const b = max ? Math.max(...v) : Math.min(...v); return (d) => fn(d) === b ? " best" : ""; };
    const bt = best((d) => tempOf(d), true), bf = best((d) => d.flight), bw = best((d) => wk[d.id][0]);
    const row = (label, cell) => `<tr><th scope="row">${label}</th>${ds.map(cell).join("")}</tr>`;
    showSheet(`<div class="sheet-content">
      <h2 id="sheetTitle">Vergleich</h2>
      <p class="sheet-note">Für den ${MONTHS[inspo.month]} · Bestwert je Zeile hervorgehoben · Preise grobe Richtwerte</p>
      <div class="cmp-wrap"><table class="cmp">
        <thead><tr><th></th>${ds.map((d) => `<th scope="col"><button type="button" data-inspo-open="${esc(d.id)}">${wikiSlot(d.wiki, "cmp-ph")}<span>${esc(d.name)}</span></button></th>`).join("")}</tr></thead>
        <tbody>
          ${row(`Temperatur`, (d) => `<td class="${bt(d)}">${tempOf(d)} °C</td>`)}
          ${row("Regenzeit", (d) => `<td>${rainy(d) ? `${ic("cloud-rain")}ja` : "–"}</td>`)}
          ${row("Flugzeit", (d) => `<td class="${bf(d)}">${num(d.flight)} Std.</td>`)}
          ${row(`Gesamt (${inspo.pax} P., ${inspo.nights} N.)`, (d) => `<td class="${bw(d)}">${euro(...wk[d.id])}</td>`)}
          ${row("Hotel / Nacht", (d) => `<td>${euro(...d.hotel)}</td>`)}
          ${row("Flug p. P.", (d) => `<td>${euro(...d.fly)}</td>`)}
          ${row(`Tipp im ${MON[inspo.month]}`, (d) => `<td class="small">${esc(tipOf(d) || "–")}</td>`)}
          ${row("Beste Monate", (d) => `<td class="small">${MON.filter((_, m) => tipOf(d, m)).join(", ") || "–"}</td>`)}
          ${row("Themen", (d) => `<td class="small">${d.tags.map((t) => INSPO_TAGS[t]?.[0]).filter(Boolean).join(", ")}</td>`)}
        </tbody>
      </table></div>
    </div>`);
  }

  // ---------- Detailblatt eines Ziels ----------
  let inspoOpen = null, sheetMode = "";
  function openInspo(id) {
    const d = INSPO.find((x) => x.id === id); if (!d) return;
    inspoOpen = id; sheetMode = "inspo";
    const t = tempOf(d), tip = tipOf(d);
    const good = MONTHS.map((name, m) => [name, tipOf(d, m)]).filter(([, why]) => why);
    showSheet(`
      ${d.wiki ? `<div class="sheet-photo" data-wiki="${esc(d.wiki)}" data-size="large"><a data-credit href="https://wikipedia.org" target="_blank" rel="noopener">Foto: Wikipedia</a></div>` : ""}
      <div class="sheet-content">
        <div class="sheet-cat">
          <span class="t-${tempClass(t)}">${ic(tempIcon(t))}ca. ${t} °C im ${MONTHS[inspo.month]}</span>
          <span>${ic("plane")}ca. ${flightText(d.flight)}</span>
          ${d.tags.map((x) => INSPO_TAGS[x] ? `<span>${ic(INSPO_TAGS[x][1])}${esc(INSPO_TAGS[x][0])}</span>` : "").join("")}
        </div>
        <h2 id="sheetTitle">${esc(d.name)}</h2>
        <div class="meta"><span>${esc(d.country)}</span></div>
        <p class="sheet-note">${esc(d.pitch)}</p>
        <div class="sheet-acts sheet-acts-top">
          <button class="btn btn-fill btn-lg" type="button" data-plan="${esc(d.id)}">${ic("calendar-plus")}Als Reise planen</button>
          <button class="btn btn-lg fav-btn" type="button" data-inspo-fav="${esc(d.id)}" aria-pressed="${inspo.favs.has(d.id)}">${ic("heart")}<span>${inspo.favs.has(d.id) ? "Gemerkt" : "Merken"}</span></button>
        </div>
        ${tip ? `<div class="notice inspo-notice tip">${ic("sparkles")}<span><b>Tipp im ${MONTHS[inspo.month]}:</b> ${esc(tip)}</span></div>` : ""}
        ${rainy(d) ? `<div class="notice inspo-notice rain">${ic("cloud-rain")}<span>Im ${MONTHS[inspo.month]} ist dort Regenzeit – oft kurze, kräftige Schauer, schwül, teils Stürme.</span></div>` : ""}
        ${offSeason(d) ? `<div class="notice inspo-notice">${ic("info")}<span>${esc(d.off)}</span></div>` : ""}
        <h3 class="sheet-h">Kosten (grobe Richtwerte)</h3>
        <div id="costBox">${costBoxHtml(d)}</div>
        <p class="inspo-fine">Je nach Saison, Ferien und Buchungszeitpunkt – aktuelle Preise über die Links unten.</p>
        <h3 class="sheet-h">Klima (Tageshöchstwerte)</h3>
        <div class="clim" role="img" aria-label="Höchsttemperaturen Januar bis Dezember: ${d.temps.join(", ")} Grad">
          ${d.temps.map((x, m) => `<button type="button" class="clim-m${m === inspo.month ? " on" : ""}${tipOf(d, m) ? " tip" : ""}${rainy(d, m) ? " rain" : ""}" data-clim="${m}" aria-label="${MONTHS[m]}"><span class="v">${x}°</span><span class="bar ${tempClass(x)}" style="height:${Math.round(6 + 54 * (Math.min(42, Math.max(-10, x)) + 10) / 52)}px"></span><span class="m">${MON[m].slice(0, 1)}</span></button>`).join("")}
        </div>
        <p class="inspo-fine">Monat antippen zum Wechseln · <span class="lg-tip">lila</span> = Reisetipp${d.rain ? " · gestreift = Regenzeit" : ""}</p>
        ${good.length ? `<h3 class="sheet-h">Besonders gut im</h3><ul class="sheet-list good">${good.map(([name, why]) => `<li>${ic("sparkles")}<span><b>${name}:</b> ${esc(why)}</span></li>`).join("")}</ul>` : ""}
        <h3 class="sheet-h">Highlights</h3>
        <ul class="sheet-list">${d.highlights.map((h) => `<li>${ic("star")}${esc(h)}</li>`).join("")}</ul>
        <h3 class="sheet-h">Eine Woche in ${esc(d.name)}</h3>
        <ol class="week">${d.week.map((w, i) => `<li><b>Tag ${i + 1}</b><span>${esc(w)}</span></li>`).join("")}</ol>
        <div class="sheet-acts">
          ${ext("https://www.google.com/travel/flights?q=" + encodeURIComponent("Flüge nach " + shortName(d)), "Flüge suchen", "plane", "btn btn-lg")}
          ${ext("https://www.google.com/travel/hotels/" + encodeURIComponent(shortName(d)), "Unterkünfte", "bed-double", "btn btn-lg")}
          ${ext("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(d.name + ", " + d.country), "Karte", "map", "btn btn-lg")}
          <button class="btn btn-lg" type="button" data-share-inspo="${esc(d.id)}">${ic("share")}Teilen</button>
        </div>
      </div>`);
  }
  // Kostenrechner im Detailblatt: Personen, Nächte, Ausgaben vor Ort – gilt auch für Karten, Filter und Vergleich
  const stepper = (k, val, lo, hi, label) => `<div class="stepper" role="group" aria-label="${label}">
    <button type="button" data-step="${k}" data-d="-1" aria-label="${label} weniger"${val <= lo ? " disabled" : ""}>−</button>
    <b>${val}</b><button type="button" data-step="${k}" data-d="1" aria-label="${label} mehr"${val >= hi ? " disabled" : ""}>+</button></div>`;
  function costBoxHtml(d) {
    const c = tripCost(d);
    return `<div class="list inspo-costs">
      <div class="row"><span class="cost-ic">${ic("users")}</span><div class="main"><div class="title">Reisende</div></div>${stepper("pax", inspo.pax, 1, 8, "Personen")}</div>
      <div class="row"><span class="cost-ic">${ic("moon")}</span><div class="main"><div class="title">Nächte</div></div>${stepper("nights", inspo.nights, 2, 21, "Nächte")}</div>
      <label class="row"><span class="cost-ic">${ic("utensils")}</span><div class="main"><div class="title">Ausgaben vor Ort</div><div class="text">Essen, Nahverkehr, Eintritte · ca. ${euro(...c.daily)} p. P./Tag</div></div>
        <input class="switch" type="checkbox" data-spend${inspo.spend ? " checked" : ""}></label>
    </div>
    <div class="list inspo-costs cost-sum">
      <div class="row"><span class="cost-ic">${ic("bed-double")}</span><div class="main"><div class="title">Hotel</div><div class="text">${c.rooms} ${c.rooms === 1 ? "Doppelzimmer" : "Doppelzimmer"} × ${inspo.nights} Nächte à ${euro(...d.hotel)}</div></div><div class="trail"><b>${euro(...c.hotel)}</b></div></div>
      <div class="row"><span class="cost-ic">${ic("plane")}</span><div class="main"><div class="title">Flüge</div><div class="text">${inspo.pax} × ${euro(...d.fly)} hin &amp; zurück</div></div><div class="trail"><b>${euro(...c.fly)}</b></div></div>
      ${inspo.spend ? `<div class="row"><span class="cost-ic">${ic("utensils")}</span><div class="main"><div class="title">Vor Ort</div><div class="text">${inspo.pax} × ${inspo.nights} Tage</div></div><div class="trail"><b>${euro(...c.local)}</b></div></div>` : ""}
      <div class="row total"><span class="cost-ic">${ic("euro")}</span><div class="main"><div class="title">Gesamt</div><div class="text">${inspo.pax > 1 ? `ca. ${euro(...c.perPax)} pro Person` : "für dich allein"}</div></div><div class="trail"><b>${euro(...c.total)}</b></div></div>
    </div>`;
  }
  function changeGroup(k, delta) {
    if (k === "pax") inspo.pax = Math.min(8, Math.max(1, inspo.pax + delta));
    if (k === "nights") inspo.nights = Math.min(21, Math.max(2, inspo.nights + delta));
    savePrefs(); renderInspo();
    if ($("#costBox") && inspoOpen) $("#costBox").innerHTML = costBoxHtml(INSPO.find((x) => x.id === inspoOpen));
    if ($("#groupBox")) $("#groupBox").innerHTML = groupBoxHtml();
  }
  // Eigenes Blatt „Reisende & Dauer“ (Knopf in der Leiste)
  function groupBoxHtml() {
    return `<div class="list inspo-costs">
      <div class="row"><span class="cost-ic">${ic("users")}</span><div class="main"><div class="title">Reisende</div><div class="text">Je 2 Personen ein Doppelzimmer</div></div>${stepper("pax", inspo.pax, 1, 8, "Personen")}</div>
      <div class="row"><span class="cost-ic">${ic("moon")}</span><div class="main"><div class="title">Nächte</div></div>${stepper("nights", inspo.nights, 2, 21, "Nächte")}</div>
      <label class="row"><span class="cost-ic">${ic("utensils")}</span><div class="main"><div class="title">Ausgaben vor Ort einrechnen</div><div class="text">Essen, Nahverkehr, Eintritte (Schätzung)</div></div>
        <input class="switch" type="checkbox" data-spend${inspo.spend ? " checked" : ""}></label>
    </div>`;
  }
  function openGroupSheet() {
    sheetMode = "group"; inspoOpen = null;
    showSheet(`<div class="sheet-content">
      <h2 id="sheetTitle">Reisende &amp; Dauer</h2>
      <p class="sheet-note">Alle Preise, das Budget und der Vergleich rechnen damit.</p>
      <div id="groupBox">${groupBoxHtml()}</div>
      <div class="sheet-acts"><button class="btn btn-fill btn-lg" type="button" data-close style="grid-column:1/-1">Fertig</button></div>
    </div>`);
  }

  async function shareInspo(id) {
    const d = INSPO.find((x) => x.id === id); if (!d) return;
    const url = `${location.origin}/#inspiration/${encodeURIComponent(d.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${d.name} – Reiseidee`, text: d.pitch, url });
      else { await navigator.clipboard.writeText(url); toast("Link kopiert"); }
    } catch { /* abgebrochen */ }
  }

  // ---------- Aus einem Ziel eine eigene Reise machen (nur auf diesem Gerät, localStorage „mytrips“) ----------
  function defaultStart() {
    // erster Samstag im gewählten Monat, der noch in der Zukunft liegt
    const now = new Date();
    for (let y = now.getFullYear(); y <= now.getFullYear() + 1; y++) {
      const d = new Date(y, inspo.month, 1);
      d.setDate(1 + ((6 - d.getDay() + 7) % 7));
      if (d > now) return isoDay(d);
    }
    return isoDay(new Date(now.getTime() + 30 * DAY_MS));
  }
  function openPlanSheet(id) {
    const d = INSPO.find((x) => x.id === id); if (!d) return;
    sheetMode = "plan";
    showSheet(`<div class="sheet-content">
      <h2 id="sheetTitle">Reise nach ${esc(shortName(d))} planen</h2>
      <p class="sheet-note">Der Wochenplan wird als Entwurf übernommen – mit Tagesplan, Checklisten, Wetter und Karte. Buchungen kannst du danach unter „Infos“ eintragen.</p>
      <div class="list form">
        <label class="row"><span class="main title">Anreise</span><input type="date" id="planStart" value="${defaultStart()}" min="${isoDay(new Date())}"></label>
        <label class="row"><span class="main title">Nächte</span><select id="planNights">${Array.from({ length: 19 }, (_, i) => i + 2).map((n) => `<option value="${n}"${n === inspo.nights ? " selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="row"><span class="main title">Personen</span><select id="planPax">${Array.from({ length: 8 }, (_, i) => i + 1).map((n) => `<option value="${n}"${n === inspo.pax ? " selected" : ""}>${n}</option>`).join("")}</select></label>
      </div>
      <p class="inspo-fine">Gespeichert nur in diesem Browser.</p>
      <div class="sheet-acts">
        <button class="btn btn-lg" type="button" data-inspo-open="${esc(d.id)}">Zurück</button>
        <button class="btn btn-fill btn-lg" type="button" data-plan-create="${esc(d.id)}">${ic("plus")}Reise anlegen</button>
      </div>
    </div>`);
  }
  function createMyTrip(destId) {
    const start = $("#planStart").value, nights = Number($("#planNights").value) || 7, pax = Number($("#planPax").value) || 2;
    if (!/^\d{4}-\d\d-\d\d$/.test(start)) { $("#planStart").focus(); return; }
    const id = `x-${destId}-${start}`;
    const list = lsGet("mytrips", []).filter((t) => t.id !== id);
    list.push({ id, dest: destId, start, nights, pax });
    lsSet("mytrips", list);
    location.href = `/${id}/`;
  }
  function buildMyTrip(t) {
    const d = INSPO.find((x) => x.id === t.dest);
    if (!d || !/^\d{4}-\d\d-\d\d$/.test(t.start)) return null;
    const n = Math.min(Math.max(Number(t.nights) || 7, 1), 30) + 1, s = dateOf(t.start), m = s.getMonth();
    const pax = clampInt(t.pax, 1, 8, 2), cost = tripCost(d, pax, n - 1, true);
    const name = shortName(d), far = d.flight >= FAR, temp = d.temps[m], tip = tipOf(d, m);
    const highlights = d.highlights.map((h, i) => ({ id: "h" + (i + 1), cats: ["highlight"], name: h, wiki: "" }));
    const match = (part) => highlights.find((h) => { const a = fold(h.name), b = fold(part); return a.includes(b) || b.includes(a.split(/[ (]/)[0]); });
    const days = Array.from({ length: n }, (_, i) => {
      const day = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
      const date = `${day.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "")} ${day.getDate()}.${day.getMonth() + 1}.`;
      const last = i === n - 1;
      const text = last ? d.week[6] : i < 6 ? d.week[i] : "Freier Tag: Lieblingsorte, Ausflug oder einfach Pause";
      const parts = last ? [] : text.replace(/^(Ankommen|Ankunft)[^,&]*(,|&)?\s*/i, "").split(/\s*(?:,|&| und |→)\s*/).filter((x) => x.length > 2);
      const stops = [
        ...(i === 0 ? [{ time: "", icon: "plane", text: "Anreise & ankommen" }] : []),
        ...parts.map((p) => { const h = match(p); return { time: "", icon: h ? "star" : "map-pin", text: p, place: h && h.id }; }),
        ...(last ? [{ time: "", icon: "plane", text: "Abreise" }] : [])
      ];
      return { date, title: last ? "Abreise" : text, stops };
    });
    const end = new Date(s.getFullYear(), s.getMonth(), s.getDate() + n - 1);
    return {
      id: t.id, mine: true, dest: d.id, title: name, icon: "/icons/reisen.svg", wiki: d.wiki, theme: "hub",
      subtitle: `${d.country} · eigener Entwurf`, start: t.start, end: isoDay(end),
      center: { lat: d.ll[0], lng: d.ll[1], zoom: 11, name }, near: 3,
      notice: "Eigener Entwurf aus der Inspiration – gespeichert nur in diesem Browser.",
      cost: `ca. ${euro(...cost.total)} für ${pax} ${pax === 1 ? "Person" : "Personen"}`, hotel: null,
      base: { name, label: "vom Zentrum", around: "um das Zentrum", lat: d.ll[0], lng: d.ll[1] },
      facts: [
        { label: "Dauer", value: `${n} Tage / ${n - 1} Nächte` },
        { label: `Wetter im ${MONTHS[m]}`, value: `ca. ${temp} °C tagsüber${rainy(d, m) ? ", Regenzeit" : ""}` },
        { label: "Anreise", value: `ca. ${flightText(d.flight)}` },
        { label: "Kosten (Richtwert)", value: `${euro(...cost.total)} für ${pax} ${pax === 1 ? "Person" : "Personen"} inkl. vor Ort` }
      ],
      images: {}, days,
      cats: { ort: { label: "Ziel", icon: "map-pin", color: "#34566f" }, highlight: { label: "Highlights", icon: "star", color: "#007AFF" } },
      places: [{ id: "zentrum", cats: ["ort"], name, note: d.pitch, wiki: d.wiki, lat: d.ll[0], lng: d.ll[1] }, ...highlights],
      checklists: [
        { id: "vorher", title: "Vor der Reise", items: [
          { id: "flug", text: "Flug buchen" }, { id: "hotel", text: "Unterkunft buchen" },
          { id: "pass", text: far ? "Reisepass mind. 6 Monate gültig" : "Ausweis oder Reisepass gültig" },
          { id: "einreise", text: "Einreise & Visum prüfen (Auswärtiges Amt)" },
          { id: "vers", text: "Auslandskrankenversicherung" },
          ...(far ? [{ id: "impf", text: "Impfungen beim Hausarzt klären" }] : []),
          { id: "geld", text: "Kreditkarte & etwas Bargeld" }] },
        { id: "pack", title: "Packliste", items: [
          { id: "lader", text: "Ladekabel, Powerbank, ggf. Adapter" }, { id: "medis", text: "Medikamente & Reiseapotheke" },
          temp >= 20 ? { id: "sonne", text: "Sonnencreme, Sonnenbrille, Badesachen" } : { id: "jacke", text: "Warme Jacke & Regenschutz" },
          { id: "schuhe", text: "Bequeme Schuhe" }] }
      ],
      infos: [
        { icon: "sun", title: `Wetter im ${MONTHS[m]}`, text: `Üblich ca. ${temp} °C tagsüber.${rainy(d, m) ? " Regenzeit: kurze, kräftige Schauer einplanen." : ""}` },
        ...(tip ? [{ icon: "sparkles", title: `Tipp im ${MONTHS[m]}`, text: tip }] : []),
        { icon: "euro", title: "Kosten (Richtwerte)", text: `Hotel ${euro(...cost.hotel)} (${cost.rooms} DZ à ${euro(...d.hotel)}/Nacht), Flüge ${euro(...cost.fly)}, vor Ort ${euro(...cost.local)} (ca. ${euro(...cost.daily)} p. P./Tag). Gesamt ${euro(...cost.total)}.` },
        ...(d.off ? [{ icon: "info", title: "Nebensaison", text: d.off }] : [])
      ]
    };
  }
  lsGet("mytrips", []).map(buildMyTrip).filter(Boolean).forEach((t) => TRIPS.push(t));

  function onHubSheetClick(e) {
    const t = e.target;
    const f = t.closest("[data-inspo-fav]"); if (f) return toggleInspoFav(f.dataset.inspoFav);
    const c = t.closest("[data-clim]");
    if (c && inspoOpen) {
      // Monat im Klima-Diagramm antippen = Reisemonat wechseln, Blatt bleibt an der Stelle
      const panel = $(".sheet-panel"), y = panel.scrollTop;
      setInspoMonth(Number(c.dataset.clim)); openInspo(inspoOpen); panel.scrollTop = y;
      return;
    }
    const st = t.closest("[data-step]"); if (st) return changeGroup(st.dataset.step, Number(st.dataset.d));
    if (t.closest("[data-group]")) return openGroupSheet();
    const mp = t.closest("[data-month-pick]"); if (mp) { setInspoMonth(Number(mp.dataset.monthPick)); return closeSheet(); }
    const seg = t.closest("[data-f] [data-v]");
    if (seg) { inspo[seg.parentElement.dataset.f] = seg.dataset.v; savePrefs(); return redrawFilterSheet(); }
    const ft = t.closest("[data-ft]"); if (ft) { inspo[ft.dataset.ft] = !inspo[ft.dataset.ft]; return redrawFilterSheet(); }
    const tg = t.closest("[data-ftag]"); if (tg) { inspo.tag = inspo.tag === tg.dataset.ftag ? "" : tg.dataset.ftag; return redrawFilterSheet(); }
    if (t.closest("[data-freset]")) { inspo.sort = "tip"; clearFilter("all"); return redrawFilterSheet(); }
    const op = t.closest("[data-inspo-open]"); if (op) return openInspo(op.dataset.inspoOpen);
    const sh = t.closest("[data-share-inspo]"); if (sh) return shareInspo(sh.dataset.shareInspo);
    const pl = t.closest("[data-plan]"); if (pl) return openPlanSheet(pl.dataset.plan);
    const pc = t.closest("[data-plan-create]"); if (pc) return createMyTrip(pc.dataset.planCreate);
  }
  function initInspo() {
    $("#inspoQ").placeholder = "Ziel suchen";
    $("#inspoMonthBtn").addEventListener("click", openMonthSheet);
    $("#inspoFilterBtn").addEventListener("click", openFilterSheet);
    $("#inspoView").addEventListener("click", (e) => {
      const b = e.target.closest("[data-view]"); if (!b) return;
      inspo.view = b.dataset.view; lsSet("inspo.view", inspo.view);
      renderInspo();
    });
    let t;
    $("#inspoQ").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { inspo.q = e.target.value.trim(); renderInspo(); }, 120); });
    const onClear = (e) => {
      const c = e.target.closest("[data-clear]"); if (c) { clearFilter(c.dataset.clear); renderInspo(); return true; }
      if (e.target.closest("[data-compare]")) { openCompare(); return true; }
      return false;
    };
    $("#inspoActive").addEventListener("click", onClear);
    $("#inspoGrid").addEventListener("click", (e) => {
      if (onClear(e)) return;
      const f = e.target.closest("[data-inspo-fav]");
      if (f) { toggleInspoFav(f.dataset.inspoFav); return; }
      const c = e.target.closest("[data-inspo]");
      if (c) openInspo(c.dataset.inspo);
    });
    $("#inspoGrid").addEventListener("keydown", (e) => {
      const c = e.target.closest("[data-inspo]");
      if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openInspo(c.dataset.inspo); }
    });
    // Budget-Regler im Filterblatt: live filtern, Blatt nicht neu zeichnen (sonst reißt das Ziehen ab)
    $("#sheetBody").addEventListener("input", (e) => {
      if (e.target.id !== "fBudget") return;
      inspo.budget = Number(e.target.value);
      syncFilterSheet(); renderInspo();
    });
    $("#sheetBody").addEventListener("change", (e) => {
      if (e.target.id === "fBudget") savePrefs();
      if (!e.target.matches("[data-spend]")) return;
      inspo.spend = e.target.checked; changeGroup("", 0);
    });
    $("#inspoGroupBtn").addEventListener("click", openGroupSheet);
    renderInspo();
  }
  // Reiter der Startseite: Meine Reisen | Inspiration (#inspiration)
  function hubRoute() {
    const tab = location.hash.startsWith("#inspiration") ? "inspiration" : "reisen";
    if (tab === "reisen" && inspoReady) renderHubList();  // gemerkte Ideen können sich geändert haben
    $("#hubList").hidden = tab !== "reisen";
    $("#inspo").hidden = tab !== "inspiration";
    $("#hubTabs").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.hubtab === tab)));
    if (tab === "inspiration" && !inspoReady) { inspoReady = true; initInspo(); }
    else if (tab === "inspiration" && inspo.view === "map" && wmap) wmap.invalidateSize();
    const id = location.hash.split("/")[1];
    if (id) openInspo(decodeURIComponent(id));
  }
  let inspoReady = false;

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
    window.addEventListener("hashchange", () => { if (!legacy()) { if (!$("#sheet").hidden) { sheetHistory = false; closeSheet(true); } hubRoute(); } });
    renderHub();
    initSheet(onHubSheetClick);
    $("#hubTabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-hubtab]"); if (!b) return;
      history.replaceState(null, "", b.dataset.hubtab === "inspiration" ? "#inspiration" : location.pathname);
      hubRoute();
    });
    hubRoute();
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
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
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
    setStatus(bookingStatus(TRIP) || tripStatus(TRIP));
    if (TRIP.notice) { $("#notice").textContent = TRIP.notice; $("#noticeBox").hidden = false; }
  }

  // ---------- Plan ----------
  function renderFacts() {
    $("#facts").innerHTML = TRIP.facts.map((f) =>
      `<div class="row"><div class="k">${esc(f.label)}</div><div class="v">${esc(f.value)}</div></div>`).join("");
    $("#cost").textContent = TRIP.cost || "";
  }

  // Datum (ISO) von Reisetag i
  const dayIso = (i) => { const s = dateOf(TRIP.start); return isoDay(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i)); };
  // Programmpunkte eines Tages inkl. Buchungen (nach Uhrzeit einsortiert)
  function dayStops(i) {
    const stops = [...DAYS[i].stops], iso = dayIso(i);
    bookingsOf(TRIP).filter((b) => b.date === iso).forEach((b) => {
      const [label, icon] = BOOK_TYPES[b.type] || BOOK_TYPES.other;
      const st = { time: b.time || "", icon, text: b.title ? `${label}: ${b.title}` : label, booking: b };
      const at = b.time ? stops.findIndex((x) => /^\d\d:\d\d$/.test(x.time) && x.time > b.time) : 0;
      stops.splice(at < 0 ? stops.length : at, 0, st);
    });
    return stops;
  }
  // Orte eines Tages mit Koordinaten, nur in der Stadt, in der die meisten liegen (Rom-Tag: nur Rom)
  function dayPoints(stops) {
    const ps = stops.map((s) => s.place && byId[s.place]).filter((p) => p && hasPos(p));
    const count = {}; ps.forEach((p) => { count[cityOf(p)] = (count[cityOf(p)] || 0) + 1; });
    const city = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
    return ps.filter((p, j) => cityOf(p) === city && (j === 0 || p !== ps[j - 1]));
  }
  const googleRoute = (pts) => "https://www.google.com/maps/dir/?api=1&travelmode=walking" +
    `&origin=${pts[0].lat},${pts[0].lng}&destination=${pts[pts.length - 1].lat},${pts[pts.length - 1].lng}` +
    (pts.length > 2 ? "&waypoints=" + encodeURIComponent(pts.slice(1, -1).slice(0, 9).map((p) => `${p.lat},${p.lng}`).join("|")) : "");
  // Schlechtwetter-Ideen: Orte „drinnen“ (TRIP.indoor = Kategorien) nahe den Orten des Tages
  function indoorIdeas(pts) {
    if (!TRIP.indoor || !pts.length) return [];
    const c = { lat: pts.reduce((a, p) => a + p.lat, 0) / pts.length, lng: pts.reduce((a, p) => a + p.lng, 0) / pts.length };
    const city = cityOf(pts[0]), inDay = new Set(pts.map((p) => p.id));
    return PLACES.filter((p) => hasPos(p) && !inDay.has(p.id) && cityOf(p) === city && p.cats.some((k) => TRIP.indoor.includes(k)) && (!p.rating || p.rating >= 4.3))
      .map((p) => ({ p, d: km(c, p) })).sort((a, b) => a.d - b.d).slice(0, 4);
  }

  function renderDays() {
    const today = dayIndex(TRIP);
    const hhmm = nowHM();

    $("#daynav").innerHTML = DAYS.map((d, i) =>
      `<a href="#tag-${i + 1}" class="${i === today ? "is-today" : ""}"><small>${esc(d.date.split(" ")[0])}</small><b>${esc(parseInt(d.date.split(" ")[1], 10) || i + 1)}</b></a>`).join("");

    const openRain = new Set([...document.querySelectorAll(".rainbox[open]")].map((x) => x.dataset.rain));
    $("#days").innerHTML = DAYS.map((d, i) => {
      const isToday = i === today;
      const all = dayStops(i);
      const nowIdx = isToday ? all.reduce((acc, s, j) => (s.time && s.time <= hhmm ? j : acc), -1) : -1;
      const img = d.image && IMAGES[d.image];
      const tags = [
        isToday ? `<span class="tag today">Heute</span>` : "",
        d.tip ? `<span class="tag">${ic("info")}${esc(d.tip)}</span>` : "",
        d.ni ? `<span class="tag warn">${ic("id-card")}Nordirland: Pass & Pfund</span>` : "",
        d.alt ? `<span class="tag alt">${ic("shuffle")}${esc(d.alt)}</span>` : ""
      ].join("");
      const stopActs = (s) => (s.links || []).map((l) => ext(l.url, l.label, linkIcon(l.label))).join("");
      // Programmpunkte mit Ort: Text antippen öffnet das Detailblatt (Foto, Route, Karte); Buchungen öffnen ihr Formular
      const stopText = (s) => s.booking
        ? `<button class="txt txt-link" type="button" data-booking="${esc(s.booking.id)}">${esc(s.text)}${ic("chevron-right")}</button>
           ${s.booking.info || s.booking.ref ? `<div class="sub">${esc([s.booking.info, s.booking.ref && "Nr. " + s.booking.ref].filter(Boolean).join(" · "))}</div>` : ""}`
        : s.place && byId[s.place]
          ? `<button class="txt txt-link" type="button" data-open="${esc(s.place)}">${esc(s.text)}${ic("chevron-right")}</button>`
          : `<div class="txt">${esc(s.text)}</div>`;
      // Fußweg zwischen zwei aufeinanderfolgenden Orten
      const leg = (a, b) => {
        const pa = a.place && byId[a.place], pb = b && b.place && byId[b.place];
        if (!pa || !pb || pa === pb || !hasPos(pa) || !hasPos(pb) || cityOf(pa) !== cityOf(pb)) return "";
        const dist = km(pa, pb);
        if (dist < 0.08) return "";
        return `<li class="leg"><span>${ic(dist <= 4 ? "footprints" : "bus")}${dist <= 4 ? `${walk(dist)} zu Fuß` : "Bus, Taxi oder Bahn"} · ${fmtKm(dist)}</span></li>`;
      };
      const stops = all.map((s, j) => {
        const cls = [isToday ? (j === nowIdx ? "is-now" : j < nowIdx ? "is-past" : "") : "", s.booking ? "is-booking" : ""].join(" ");
        return `<li class="stop ${cls}">
          <div class="time">${esc(s.time)}</div>
          <div class="tile">${ic(s.icon)}</div>
          <div>${stopText(s)}<div class="acts">${stopActs(s)}</div></div>
        </li>${leg(s, all[j + 1])}`;
      }).join("");
      const pts = dayPoints(all);
      const total = pts.slice(1).reduce((a, p, j) => a + km(pts[j], p), 0);
      const ideas = indoorIdeas(pts);
      return `<article class="card day ${isToday ? "is-today" : ""}" id="tag-${i + 1}">
        ${img ? `<div class="day-img is-loaded"><img src="${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy" decoding="async" width="960" height="480"><a href="${esc(img.page)}" target="_blank" rel="noopener">Foto: Wikimedia</a></div>`
          : wikiSlot(d.wiki, "day-img", "large", true)}
        <div class="day-head">
          <div class="day-kicker">Tag ${i + 1} · ${esc(d.date)}</div>
          <h3 class="day-title">${esc(d.title)}</h3>
          ${tags ? `<div class="day-meta">${tags}</div>` : ""}
        </div>
        <ol class="timeline">${stops}</ol>
        ${pts.length >= 2 ? `<div class="day-route">${ext(googleRoute(pts), `Route des Tages · ${pts.length} Stopps`, "route", "btn")}<span class="muted">ca. ${fmtKm(total)} Luftlinie</span></div>` : ""}
        ${d.extras && d.extras.length ? `<div class="extras">
          <div class="extras-head">${ic("sparkles")}Falls noch Zeit ist</div>
          <ul>${d.extras.map((x) => `<li class="extra"><div class="tile">${ic(x.icon || "sparkles")}</div>
            <div>${stopText(x)}<div class="acts">${stopActs(x)}</div></div></li>`).join("")}</ul>
        </div>` : ""}
        ${ideas.length ? `<details class="rainbox" data-rain="${i}">
          <summary>${ic("umbrella")}<span>Bei Regen: Ideen für drinnen</span>${ic("chevron-down")}</summary>
          <div class="rain-list">${ideas.map(({ p, d: dist }) => `<button class="rain-idea" type="button" data-open="${esc(p.id)}">
            <span class="tile" style="--c:${esc(CATS[p.cats.find((k) => TRIP.indoor.includes(k))].color)}">${ic(CATS[p.cats.find((k) => TRIP.indoor.includes(k))].icon)}</span>
            <span class="main"><span class="title">${esc(p.name)}</span><span class="text">${p.rating ? `${ic("star")}${num(p.rating)} · ` : ""}${fmtKm(dist)} vom Tagesprogramm</span></span>${ic("chevron-right")}</button>`).join("")}</div>
        </details>` : ""}
      </article>`;
    }).join("");

    // Wikimedia-Vorschau fehlt (z. B. offline) → Bildbereich ausblenden
    document.querySelectorAll(".day-img img").forEach((im) => im.addEventListener("error", () => im.parentElement.remove(), { once: true }));
    observeWiki($("#days"));
    openRain.forEach((k) => { const x = $(`.rainbox[data-rain="${k}"]`); if (x) x.open = true; });
    if (wxData) markRainDays(wxData);
  }
  // Regen in der Vorhersage für einen Reisetag → Schlechtwetter-Ideen aufklappen und hervorheben
  const RAIN_CODES = [61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
  function markRainDays(data) {
    const t = data.daily.time;
    DAYS.forEach((_, i) => {
      const box = $(`.rainbox[data-rain="${i}"]`), k = t.indexOf(dayIso(i));
      if (!box || k < 0) return;
      const prob = data.daily.precipitation_probability_max[k] || 0;
      if (prob < 60 && !RAIN_CODES.includes(data.daily.weather_code[k])) return;
      box.classList.add("is-rain"); box.open = true;
      box.querySelector("summary span").textContent = `Regen angesagt (${prob} %) – Ideen für drinnen`;
    });
  }

  function renderNow() {
    const i = dayIndex(TRIP), box = $("#nowBox");
    if (i < 0 && i >= -21) {
      // Vor der Reise: nächste Buchung zeigen
      const b = nextBooking(TRIP);
      box.innerHTML = b ? `<div class="group-label">Nächste Buchung</div><div class="list"><button class="row has-tile" type="button" data-booking="${esc(b.id)}">
        <div class="tile">${ic((BOOK_TYPES[b.type] || BOOK_TYPES.other)[1])}</div>
        <div class="main"><div class="text">${esc(bookingWhen(b))}</div><div class="title">${esc(bookingLabel(b))}</div></div>
        <span class="trail">${ic("chevron-right")}</span></button></div>` : "";
      box.hidden = !b; return;
    }
    if (i < 0 || i >= DAYS.length) { box.hidden = true; return; }
    const d = { ...DAYS[i], stops: dayStops(i) }, hhmm = nowHM();
    const cur = d.stops.reduce((acc, s, j) => (s.time && s.time <= hhmm ? j : acc), -1);
    const row = (label, s, day) => `<a class="row has-tile" href="#tag-${day + 1}">
      <div class="tile">${ic(s.icon)}</div>
      <div class="main"><div class="text">${esc(label)} · ${esc(s.time)}</div><div class="title">${esc(s.text)}</div></div>
      <span class="trail">${ic("chevron-right")}</span></a>`;
    const rows = [];
    if (cur >= 0) rows.push(row("Jetzt", d.stops[cur], i));
    if (d.stops[cur + 1]) rows.push(row("Als Nächstes", d.stops[cur + 1], i));
    else if (DAYS[i + 1]) rows.push(row("Morgen", dayStops(i + 1)[0], i + 1));
    box.innerHTML = `<div class="group-label">Heute · Tag ${i + 1}: ${esc(d.title)}</div><div class="list">${rows.join("")}</div>`;
    box.hidden = !rows.length;
  }

  // ---------- Wetter (Open-Meteo) ----------
  const WX = [[[0], "sun", "Sonnig", "sun"], [[1, 2], "cloud-sun", "Heiter", "sun"], [[3], "cloud", "Bewölkt"], [[45, 48], "cloud-fog", "Nebel"],
    [[51, 53, 55, 56, 57], "cloud-drizzle", "Niesel", "rain"], [[61, 63, 65, 66, 67, 80, 81, 82], "cloud-rain", "Regen", "rain"],
    [[71, 73, 75, 77, 85, 86], "cloud-snow", "Schnee"], [[95, 96, 99], "cloud-lightning", "Gewitter", "rain"]];

  let wxData = null;
  function drawWeather(data, stamp) {
    const d = data.daily;
    wxData = data; markRainDays(data);
    $("#weather").innerHTML = d.time.slice(0, 7).map((t, i) => {
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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${TRIP.center.lat}&longitude=${TRIP.center.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&wind_speed_unit=kmh&timezone=auto&forecast_days=16`;
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
  const state = { cats: new Set(), q: "", near: false, sort: "cat", me: null, focus: null, favOnly: false, favs: new Set(store.get("favs", [])),
    city: TRIP.center.name, open: new Set(), limit: 40 };
  // Orte in anderen Städten (z. B. Rom-Tag) bekommen einen eigenen Umschalter
  const cityOf = (p) => p.city || TRIP.center.name;
  const CITIES = [...new Set([TRIP.center.name, ...PLACES.map(cityOf)])];
  const GROUP_PREVIEW = 6;
  // Kategorien, die nur eine andere Stadt beschreiben (z. B. „Rom-Tag“): beim Gruppieren nachrangig
  const CITY_CATS = new Set(Object.keys(CATS).filter((k) => {
    const ps = PLACES.filter((p) => p.cats.includes(k));
    return ps.length && ps.every((p) => p.city);
  }));
  const mainCat = (p) => p.cats.find((c) => state.cats.has(c)) || p.cats.find((c) => !CITY_CATS.has(c)) || p.cats[0];
  let map = null, layer = null, markers = {}, meMarker = null;

  const refPoint = () => state.me || home();
  const refLabel = () => state.me ? "von dir" : homeLabel();
  const catsOf = (p) => p.cats.map((c) => CATS[c]).filter(Boolean);
  const searchText = (p) => fold([p.name, p.note, p.kind, p.price, p.city, ...catsOf(p).map((c) => c.label), p.free ? "frei kostenlos gratis" : ""].join(" "));
  PLACES.forEach((p) => { p._s = searchText(p); });

  function visiblePlaces() {
    const terms = fold(state.q).split(/\s+/).filter(Boolean);
    return PLACES.filter((p) =>
      (terms.length > 0 || cityOf(p) === state.city) &&   // Suche läuft über alle Städte
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
  function renderCity() {
    if (CITIES.length < 2) return;
    $("#city").hidden = false;
    $("#city").innerHTML = CITIES.map((c) =>
      `<button type="button" data-city="${esc(c)}" aria-pressed="${c === state.city}">${esc(c)} <small>${PLACES.filter((p) => cityOf(p) === c).length}</small></button>`).join("");
  }
  function renderChips() {
    const used = new Set(PLACES.filter((p) => cityOf(p) === state.city).flatMap((p) => p.cats));
    $("#chips").innerHTML = [`<button class="chip" type="button" data-cat="" aria-pressed="true">Alle</button>`,
      `<button class="chip chip-fav" type="button" aria-pressed="false">${ic("heart")}Gemerkt<span data-favcount></span></button>`]
      .concat(Object.entries(CATS).filter(([k]) => used.has(k)).map(([k, c]) =>
        `<button class="chip" type="button" data-cat="${esc(k)}" aria-pressed="false" style="--c:${esc(c.color)}">${ic(c.icon)}${esc(c.label)}</button>`))
      .join("");
  }
  function initChips() {
    renderCity();
    renderChips();
    $("#city").addEventListener("click", (e) => {
      const b = e.target.closest("[data-city]"); if (!b) return;
      state.city = b.dataset.city;
      state.cats.clear(); state.open.clear(); state.limit = 40;
      $("#city").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      renderChips(); syncChips(); refresh();
    });
    $("#chips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      const cat = b.dataset.cat;
      if (b.classList.contains("chip-fav")) state.favOnly = !state.favOnly;
      else if (!cat) { state.cats.clear(); state.favOnly = false; }
      else state.cats.has(cat) ? state.cats.delete(cat) : state.cats.add(cat);
      state.open.clear(); state.limit = 40;
      syncChips();
      refresh();
    });
  }

  function placeRow(p) {
    const cat = CATS[mainCat(p)];
    const d = hasPos(p) ? km(refPoint(), p) : null;
    const meta = [
      p.rating ? `<span class="star">${ic("star")}${num(p.rating)}${p.reviews ? `<small>(${p.reviews.toLocaleString("de-DE")})</small>` : ""}</span>` : "",
      p.city && (state.q || p.city !== state.city) ? `<span>${esc(p.city)}</span>` : "",
      p.kind ? `<span>${esc(p.kind)}</span>` : "",
      p.price ? `<span>${esc(p.price)}</span>` : "",
      d !== null ? `<span>${fmtKm(d)} ${esc(refLabel())}${d < 4 ? ` · ${walk(d)} zu Fuß` : ""}</span>` : ""
    ].filter(Boolean).join("");
    return `<div class="row has-tile place ${state.focus === p.id ? "is-focus" : ""}" id="p-${esc(p.id)}" data-open="${esc(p.id)}" role="button" tabindex="0" aria-label="${esc(p.name)} – Details">
      <div class="tile" style="--c:${esc(cat.color)}">${ic(cat.icon)}</div>
      <div class="main">
        <div class="head"><div class="title">${esc(p.name)}${p.free ? `<span class="free">FREI</span>` : ""}</div>
          <button class="fav" type="button" data-fav="${esc(p.id)}" aria-pressed="${state.favs.has(p.id)}" aria-label="${esc(p.name)} merken">${ic("heart")}</button></div>
        ${meta ? `<div class="meta">${meta}</div>` : ""}
        ${p.note ? `<div class="note">${esc(p.note)}</div>` : ""}
      </div>
      ${wikiSlot(p.wiki, "ph")}
    </div>`;
  }

  // „Beste“ = Bewertung gewichtet mit der Anzahl (4,9 bei 37 Stimmen zählt weniger als 4,7 bei 20.000)
  const score = (p) => p.rating ? (p.rating * (p.reviews || 0) + 4.2 * 300) / ((p.reviews || 0) + 300) : 0;
  const byRating = (a, b) => score(b) - score(a);
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
      list.forEach((p) => { (groups[mainCat(p)] ||= []).push(p); });
      const keys = Object.keys(CATS).filter((k) => groups[k]);
      // Lange Gruppen: erst die bestbewerteten zeigen, Rest auf Wunsch (nicht, wenn gesucht oder nur eine Gruppe da ist)
      const shorten = !state.q && keys.length > 1;
      $("#list").innerHTML = keys.map((k) => {
        const all = groups[k], open = !shorten || state.open.has(k) || all.length <= GROUP_PREVIEW + 2;
        const shown = open ? all : [...all].sort(byRating).slice(0, GROUP_PREVIEW);
        return `<div class="group"><div class="group-label">${esc(CATS[k].label)} · ${all.length}</div>
          <div class="list">${shown.map(placeRow).join("")}
          ${open ? "" : `<button class="row more" type="button" data-more="${esc(k)}">Alle ${all.length} anzeigen${ic("chevron-right")}</button>`}</div></div>`;
      }).join("");
    } else {
      const sorted = [...list].sort(state.sort === "dist"
        ? (a, b) => (hasPos(a) ? km(refPoint(), a) : 1e9) - (hasPos(b) ? km(refPoint(), b) : 1e9)
        : byRating);
      $("#list").innerHTML = `<div class="group"><div class="list">${sorted.slice(0, state.limit).map(placeRow).join("")}
        ${sorted.length > state.limit ? `<button class="row more" type="button" data-more="*">Weitere ${Math.min(40, sorted.length - state.limit)} anzeigen${ic("chevron-right")}</button>` : ""}</div></div>`;
    }
    observeWiki($("#list"));
  }

  function refresh() {
    const list = visiblePlaces();
    renderList(list);
    if (!map) return;
    const show = new Set(list.map((p) => p.id));
    Object.entries(markers).forEach(([id, m]) => {
      if (show.has(id)) { if (!layer.hasLayer(m)) layer.addLayer(m); }
      else layer.removeLayer(m);
    });
  }

  const pinIcon = (html, cls, size, color = "") => L.divIcon({
    className: "", html: `<div class="${cls}"${color ? ` style="--c:${esc(color)}"` : ""}>${html}</div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2]
  });

  const ensureMap = () => (leafletLoading || loadLeaflet()).then(() => { initMap(); map.invalidateSize(); });

  function initMap() {
    if (map || !window.L) return;
    map = L.map("map", { scrollWheelZoom: false, zoomControl: false }).setView([TRIP.center.lat, TRIP.center.lng], TRIP.center.zoom || 14);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    tiles().addTo(map);
    map.attributionControl.setPrefix(false).setPosition("bottomleft");

    layer = L.layerGroup().addTo(map);
    PLACES.filter(hasPos).forEach((p) => {
      const cat = CATS[p.cats[0]];
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(ic(cat.icon), "pin", 26, cat.color), title: p.name, riseOnHover: true, keyboard: true })
        .bindTooltip(p.name, { direction: "top", offset: [0, -14] });
      m.on("click", () => { highlight(p.id); openSheet(p.id); });
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
    const m = markers[id];
    m.openTooltip();
    const el = m.getElement();
    if (el) { el.classList.remove("is-pulse"); void el.offsetWidth; el.classList.add("is-pulse"); }
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
    initChips();
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
      const f = e.target.closest("[data-fav]");
      if (f) { toggleFav(f.dataset.fav); return; }
      const more = e.target.closest("[data-more]");
      if (more) { more.dataset.more === "*" ? (state.limit += 40) : state.open.add(more.dataset.more); refresh(); return; }
      const row = e.target.closest("[data-open]");
      if (row) openSheet(row.dataset.open);
    });
    $("#list").addEventListener("keydown", (e) => {
      const row = e.target.closest("[data-open]");
      if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openSheet(row.dataset.open); }
    });
    refresh();
  }

  function toggleFav(id) {
    const on = !state.favs.has(id);
    on ? state.favs.add(id) : state.favs.delete(id);
    store.set("favs", [...state.favs]);
    document.querySelectorAll(`[data-fav="${CSS.escape(id)}"]`).forEach((b) => {
      b.setAttribute("aria-pressed", String(on));
      const label = b.querySelector("span"); if (label) label.textContent = on ? "Gemerkt" : "Merken";
    });
    syncChips();
    if (state.favOnly) refresh();
    toast(on ? "Gemerkt" : "Nicht mehr gemerkt");
  }

  // ---------- Detailblatt eines Orts (wie in Apple Karten): Foto, Infos, alle Aktionen ----------
  function openSheet(id) {
    const p = byId[id]; if (!p) return;
    const cats = catsOf(p);
    const d = hasPos(p) ? km(refPoint(), p) : null;
    const facts = [
      p.rating ? `<span class="star">${ic("star")}${num(p.rating)}${p.reviews ? `<small>(${p.reviews.toLocaleString("de-DE")} Bewertungen)</small>` : ""}</span>` : "",
      p.kind ? `<span>${esc(p.kind)}</span>` : "", p.price ? `<span>${esc(p.price)}</span>` : "",
      p.free ? `<span class="free">FREI</span>` : ""
    ].filter(Boolean).join("");
    showSheet(`
      ${p.wiki ? `<div class="sheet-photo" data-wiki="${esc(p.wiki)}" data-size="large"><a data-credit href="https://wikipedia.org" target="_blank" rel="noopener">Foto: Wikipedia</a></div>` : ""}
      <div class="sheet-content">
        <div class="sheet-cat">${cats.map((c) => `<span style="--c:${esc(c.color)}">${ic(c.icon)}${esc(c.label)}</span>`).join("")}${p.city ? `<span>${ic("map-pin")}${esc(p.city)}</span>` : ""}</div>
        <h2 id="sheetTitle">${esc(p.name)}</h2>
        ${facts ? `<div class="meta">${facts}</div>` : ""}
        ${p.note ? `<p class="sheet-note">${esc(p.note)}</p>` : ""}
        ${d !== null ? `<p class="sheet-dist">${ic("footprints")}${fmtKm(d)} ${esc(refLabel())}${d < 4 ? ` · ca. ${walk(d)} zu Fuß` : ""}</p>` : ""}
        <div class="sheet-acts">
          ${hasPos(p) ? ext(mapsRoute(p), "Route", "route", "btn btn-fill btn-lg") : ext(mapsSearch(p), "In Karten suchen", "search", "btn btn-fill btn-lg")}
          ${hasPos(p) ? `<button class="btn btn-lg" type="button" data-sheet-map="${esc(p.id)}">${ic("map")}Auf der Karte</button>` : ""}
          ${p.url ? ext(p.url, /tripadvisor/.test(p.url) ? "Tripadvisor" : "Website", "globe", "btn btn-lg") : ""}
          <button class="btn btn-lg fav-btn" type="button" data-fav="${esc(p.id)}" aria-pressed="${state.favs.has(p.id)}">${ic("heart")}<span>${state.favs.has(p.id) ? "Gemerkt" : "Merken"}</span></button>
        </div>
      </div>`);
  }
  function onTripSheetClick(e) {
    const t = e.target;
    const bt = t.closest("[data-bk-type]");
    if (bt) {
      bkType = bt.dataset.bkType;
      bt.parentElement.querySelectorAll("[data-bk-type]").forEach((x) => x.setAttribute("aria-pressed", String(x === bt)));
      $("#bkTitle").placeholder = BOOK_HINT[bkType]; $("#bkInfo").placeholder = BOOK_INFO[bkType];
      return;
    }
    const sv = t.closest("[data-bk-save]"); if (sv) return saveBooking(sv.dataset.bkSave);
    const dl = t.closest("[data-bk-del]"); if (dl) return deleteBooking(dl.dataset.bkDel);
    const cp = t.closest("[data-copy]");
    if (cp) { navigator.clipboard?.writeText(cp.dataset.copy).then(() => toast("Kopiert"), () => {}); return; }
    const f = e.target.closest("[data-fav]");
    if (f) return toggleFav(f.dataset.fav);
    const m = e.target.closest("[data-sheet-map]");
    if (m) {
      closeSheet();
      const id = m.dataset.sheetMap;
      if (location.hash.startsWith("#entdecken")) setTimeout(() => showOnMap(id), 50);
      else setTimeout(() => { location.hash = "entdecken/" + id; }, 300);  // erst history.back() abwarten
    }
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
    DAYS.forEach((day0, i) => { const day = { ...day0, stops: dayStops(i) }; day.stops.forEach((s, j) => {
      if (!/^\d\d:\d\d$/.test(s.time)) return;
      const start = zonedToUtc(y, m - 1, d0 + i, s.time, tz);
      const next = day.stops[j + 1];
      const until = next && /^\d\d:\d\d$/.test(next.time) ? zonedToUtc(y, m - 1, d0 + i, next.time, tz) - start : 3600e3;
      const end = new Date(start.getTime() + Math.min(Math.max(until, 1800e3), 3 * 3600e3));
      const place = s.place && byId[s.place];
      const url = (s.links && s.links[0] && s.links[0].url) || (place && place.url);
      lines.push("BEGIN:VEVENT", `UID:${TRIP.id}-${i + 1}-${j + 1}@reisen`, "DTSTAMP:" + stamp,
        "DTSTART:" + icsDate(start), "DTEND:" + icsDate(end), "SUMMARY:" + icsText(s.text),
        "DESCRIPTION:" + icsText(`${TRIP.title} – Tag ${i + 1}: ${day.title}` + (s.booking ? `\n${[s.booking.info, s.booking.ref && "Buchungsnr. " + s.booking.ref].filter(Boolean).join("\n")}` : "")));
      if (place) lines.push("LOCATION:" + icsText(place.name + ", " + TRIP.center.name));
      if (place && hasPos(place)) lines.push(`GEO:${place.lat};${place.lng}`);
      const bUrl = s.booking && s.booking.url;
      if (url || bUrl) lines.push("URL:" + (url || bUrl));
      lines.push("END:VEVENT");
    }); });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.map(icsFold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${TRIP.id}.ics` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    return lines.length;
  }

  function deleteMyTrip() {
    if (!confirm(`Entwurf „${TRIP.title}“ löschen?`)) return;
    lsSet("mytrips", lsGet("mytrips", []).filter((t) => t.id !== TRIP.id));
    try { Object.keys(localStorage).filter((k) => k.startsWith(TRIP.id + ".")).forEach((k) => localStorage.removeItem(k)); } catch { /* privat */ }
    location.href = "/";
  }
  async function shareTrip() {
    const data = { title: `${TRIP.title} – Reiseplan`, url: `${location.origin}/${TRIP.id}/` };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); toast("Link kopiert"); }
    } catch { /* abgebrochen */ }
  }

  // ---------- Buchungen (Infos): Liste, Formular ----------
  function renderBookings() {
    const list = bookingsOf(TRIP);
    const when = (b) => [dateOf(b.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" }), b.time].filter(Boolean).join(" · ");
    $("#bookings").innerHTML = list.map((b) => `<button class="row has-tile" type="button" data-booking="${esc(b.id)}">
        <div class="tile">${ic((BOOK_TYPES[b.type] || BOOK_TYPES.other)[1])}</div>
        <div class="main"><div class="title">${esc(bookingLabel(b))}</div>
          <div class="text">${esc([when(b), b.info, b.ref && "Nr. " + b.ref].filter(Boolean).join(" · "))}</div></div>
        <span class="trail">${ic("chevron-right")}</span></button>`).join("") +
      `<button class="row has-tile add-row" type="button" data-booking="new"><div class="tile">${ic("plus")}</div>
        <div class="main"><div class="title">Buchung hinzufügen</div>${list.length ? "" : `<div class="text">Flug, Hotel, Zug, Mietwagen oder Tickets</div>`}</div></button>`;
    // Unterkunft: ohne festes Hotel die eingetragene Hotelbuchung zeigen
    const hb = !TRIP.hotel && list.find((b) => b.type === "hotel");
    if (hb) $("#hotel").innerHTML = `<button class="row has-tile" type="button" data-booking="${esc(hb.id)}"><div class="tile">${ic("bed-double")}</div>
      <div class="main"><div class="title">${esc(hb.title || "Hotel")}</div><div class="text">${esc([hb.info, hb.ref && "Nr. " + hb.ref].filter(Boolean).join(" · ") || "Check-in " + bookingWhen(hb))}</div></div>
      <span class="trail">${ic("chevron-right")}</span></button>`;
  }
  const BOOK_HINT = { flight: "z. B. LH 330 Frankfurt → Florenz", hotel: "Name des Hotels", train: "z. B. Frecciarossa Florenz → Rom",
    car: "Anbieter, Abholort", ticket: "z. B. Uffizien", other: "Bezeichnung" };
  const BOOK_INFO = { flight: "Terminal, Sitzplatz, Gepäck …", hotel: "Adresse, Check-in ab …", train: "Wagen, Platz, Gleis …",
    car: "Abholung/Rückgabe …", ticket: "Zeitfenster, Treffpunkt …", other: "Details" };
  let bkType = "flight";
  function openBooking(id) {
    const b = id === "new" ? null : bookingsOf(TRIP).find((x) => x.id === id);
    if (id !== "new" && !b) return;
    bkType = b ? b.type || "other" : "flight";
    const v = (k) => esc(b ? b[k] || "" : "");
    const ro = b && b.fixed ? " readonly" : "";
    showSheet(`<div class="sheet-content">
      <h2 id="sheetTitle">${b ? "Buchung" : "Neue Buchung"}</h2>
      <div class="chips wrap bk-types" role="group" aria-label="Art">${Object.entries(BOOK_TYPES).map(([k, [label, icon]]) =>
        `<button class="chip" type="button" data-bk-type="${k}" aria-pressed="${k === bkType}"${ro ? " disabled" : ""}>${ic(icon)}${label}</button>`).join("")}</div>
      <div class="list form">
        <label class="row"><span class="title">Was</span><input id="bkTitle" value="${v("title")}" placeholder="${esc(BOOK_HINT[bkType])}" autocomplete="off"${ro}></label>
        <label class="row"><span class="title">Datum</span><input id="bkDate" type="date" value="${b ? v("date") : esc(TRIP.start)}"${ro}></label>
        <label class="row"><span class="title">Uhrzeit</span><input id="bkTime" type="time" value="${v("time")}"${ro}></label>
        <label class="row"><span class="title">Details</span><input id="bkInfo" value="${v("info")}" placeholder="${esc(BOOK_INFO[bkType])}" autocomplete="off"${ro}></label>
        <label class="row"><span class="title">Buchungsnr.</span><input id="bkRef" value="${v("ref")}" autocomplete="off" autocapitalize="characters"${ro}></label>
        <label class="row"><span class="title">Link</span><input id="bkUrl" type="url" value="${v("url")}" placeholder="https://…" autocomplete="off"${ro}></label>
      </div>
      <div class="sheet-acts">
        ${b && b.ref ? `<button class="btn btn-lg" type="button" data-copy="${v("ref")}">${ic("copy")}Nr. kopieren</button>` : ""}
        ${b && b.url ? ext(b.url, "Öffnen", "arrow-up-right", "btn btn-lg") : ""}
        ${b && !b.fixed ? `<button class="btn btn-lg btn-danger" type="button" data-bk-del="${esc(b.id)}">${ic("trash-2")}Löschen</button>` : ""}
        ${ro ? "" : `<button class="btn btn-fill btn-lg" type="button" data-bk-save="${esc(b ? b.id : "new")}">${ic("check")}Speichern</button>`}
      </div>
    </div>`);
  }
  function saveBooking(id) {
    const val = (s) => $(s).value.trim();
    const date = val("#bkDate");
    if (!/^\d{4}-\d\d-\d\d$/.test(date)) { $("#bkDate").focus(); return; }
    const url = val("#bkUrl");
    const b = { id: id === "new" ? "b" + Date.now().toString(36) : id, type: bkType, title: val("#bkTitle"), date, time: val("#bkTime"),
      info: val("#bkInfo"), ref: val("#bkRef"), url: /^https?:\/\//i.test(url) ? url : "" };
    const list = store.get("bookings", []).filter((x) => x.id !== b.id);
    list.push(b);
    store.set("bookings", list);
    closeSheet(); afterBookings(); toast("Gespeichert");
  }
  function deleteBooking(id) {
    store.set("bookings", store.get("bookings", []).filter((x) => x.id !== id));
    closeSheet(); afterBookings(); toast("Gelöscht");
  }
  function afterBookings() { renderBookings(); renderDays(); renderNow(); setStatus(bookingStatus(TRIP) || tripStatus(TRIP)); }

  // ---------- Infos ----------
  function renderInfos() {
    $("#tools").innerHTML = `
      <button class="row has-tile" type="button" data-act="ics"><div class="tile">${ic("calendar-plus")}</div>
        <div class="main"><div class="title">Zum Kalender hinzufügen</div><div class="text">Alle Programmpunkte als Termine (.ics)</div></div></button>
      <button class="row has-tile" type="button" data-act="share"><div class="tile">${ic("share")}</div>
        <div class="main"><div class="title">Reise teilen</div><div class="text">Link zu dieser Seite senden</div></div></button>
      ${TRIP.mine ? `<button class="row has-tile danger-row" type="button" data-act="delete"><div class="tile">${ic("trash-2")}</div>
        <div class="main"><div class="title">Entwurf löschen</div><div class="text">Entfernt die Reise samt Buchungen aus diesem Browser</div></div></button>` : ""}`;
    $("#tools").addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      if (b.dataset.act === "ics") { exportCalendar(); toast("Kalenderdatei erstellt"); }
      else if (b.dataset.act === "delete") deleteMyTrip();
      else shareTrip();
    });
    const H = TRIP.hotel;
    $("#hotel").innerHTML = H
      ? `<div class="row has-tile"><div class="tile">${ic("bed-double")}</div>
          <div class="main"><div class="title">${esc(H.name)}</div><div class="text">${esc(H.address)}</div>
          <div class="acts" style="margin-top:10px">${ext(mapsRoute(H), "Route", "route", "btn btn-fill")}${ext(H.url, "Website", "globe")}</div></div></div>`
      : `<div class="row has-tile"><div class="tile" style="--c:#8E8E93">${ic("bed-double")}</div>
          <div class="main"><div class="title">Noch nicht eingetragen</div><div class="text">Entfernungen gelten bis dahin ${esc(TRIP.base.label)}.</div></div></div>`;

    renderBookings();
    $("#bookings").addEventListener("click", (e) => { const b = e.target.closest("[data-booking]"); if (b) openBooking(b.dataset.booking); });
    $("#hotel").addEventListener("click", (e) => { const b = e.target.closest("[data-booking]"); if (b) openBooking(b.dataset.booking); });
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
    if (!$("#sheet").hidden) { sheetHistory = false; closeSheet(true); }
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
    const today = dayIndex(TRIP);
    if (/^#plan$/.test(location.hash) && today > 0 && today < DAYS.length) {
      requestAnimationFrame(() => $("#tag-" + (today + 1))?.scrollIntoView({ block: "start" }));
    }
  }

  // ---------- Start ----------
  renderHeader();
  renderFacts();
  renderNow();
  renderDays();
  $("#days").addEventListener("click", (e) => {
    const k = e.target.closest("[data-booking]"); if (k) return openBooking(k.dataset.booking);
    const b = e.target.closest("[data-open]");
    if (b) openSheet(b.dataset.open);
  });
  $("#nowBox").addEventListener("click", (e) => { const k = e.target.closest("[data-booking]"); if (k) openBooking(k.dataset.booking); });
  initSheet(onTripSheetClick);
  initNavbar(TRIP.title, true);
  if (dayIndex(TRIP) >= 0 && dayIndex(TRIP) < DAYS.length) setInterval(() => { renderNow(); renderDays(); }, 60e3);
  initDiscover();
  renderInfos();
  initTabs();
  initWeather();
  registerSW();
})();
