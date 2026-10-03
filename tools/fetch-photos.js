// Lädt für alle `wiki:`-Einträge (Reisen, Tage, Orte) das Titelbild aus Wikipedia herunter und legt es unter
// public/photos/ ab (klein 330 px für Listen, groß 960 px für Tageskarten/Titelbilder) + public/photos/photos.json.
// Läuft per GitHub Action (.github/workflows/photos.yml); vorhandene Fotos werden nicht erneut geladen.
//   node tools/fetch-photos.js            fehlende laden
//   node tools/fetch-photos.js --force    alle neu laden
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public/photos");
const UA = "ReisenPhotoFetcher/1.0 (https://github.com/tbsxxl/irland)";
const force = process.argv.includes("--force");

// Reisedaten wie im Browser laden
const sandbox = { window: {} };
vm.createContext(sandbox);
const tripDir = path.join(ROOT, "public/assets/trips");
for (const f of fs.readdirSync(tripDir).filter((f) => f.endsWith(".js"))) vm.runInContext(fs.readFileSync(path.join(tripDir, f), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "public/assets/inspiration.js"), "utf8"), sandbox);
const big = new Set(), small = new Set();
(sandbox.window.INSPIRATION || []).forEach((d) => d.wiki && big.add(d.wiki));
for (const t of sandbox.window.TRIPS) {
  if (t.wiki) big.add(t.wiki);
  t.days.forEach((d) => d.wiki && big.add(d.wiki));
  t.places.forEach((p) => p.wiki && small.add(p.wiki));
}
const titles = [...new Set([...big, ...small])].sort();

const slug = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const manifestPath = path.join(OUT, "photos.json");
const manifest = fs.existsSync(manifestPath) && !force ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
    if (res.status !== 429 && res.status < 500) return res;
    await sleep(1500 * (i + 1));
  }
  return fetch(url, { headers: { "User-Agent": UA } });
}

// Wikimedia liefert nur Standardbreiten (…, 330, 500, 960, 1280 …); ist das Original kleiner, das Original nehmen.
async function download(sourceThumb, original, width, file) {
  const candidates = [];
  if (sourceThumb && /\/\d+px-/.test(sourceThumb)) candidates.push(sourceThumb.replace(/\/\d+px-/, `/${width}px-`));
  if (original) candidates.push(original.source);
  for (const url of candidates) {
    const res = await get(url);
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !type.startsWith("image/")) continue;
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("svg") ? "svg" : "jpg";
    const name = `${file}.${ext}`;
    fs.writeFileSync(path.join(OUT, name), Buffer.from(await res.arrayBuffer()));
    return name;
  }
  return null;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let added = 0, missing = [];
  for (const title of titles) {
    const needBig = big.has(title);
    const have = manifest[title];
    if (have && (have.none || (have.s && (!needBig || have.l)))) continue;
    const [lang, name] = /^[a-z]{2}:/.test(title) ? [title.slice(0, 2), title.slice(3)] : ["en", title];
    const res = await get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, "_"))}`);
    if (!res.ok) { missing.push(`${title} (HTTP ${res.status})`); manifest[title] = { none: true }; continue; }
    const j = await res.json();
    if (!j.thumbnail) { missing.push(`${title} (kein Bild)`); manifest[title] = { none: true }; continue; }
    const base = slug(title);
    const entry = { page: j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page };
    entry.s = await download(j.thumbnail.source, j.originalimage, 330, base + "-s");
    if (needBig) entry.l = await download(j.thumbnail.source, j.originalimage, 960, base + "-l");
    if (!entry.s) { missing.push(`${title} (Download fehlgeschlagen)`); continue; }
    manifest[title] = entry;
    added++;
    console.log("✓", title);
    await sleep(250);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
  console.log(`\n${added} neu, ${Object.values(manifest).filter((m) => m.s).length} Fotos insgesamt, ${titles.length} Titel.`);
  if (missing.length) console.log("Ohne Foto:\n  " + missing.join("\n  "));
})();
