// Baut public/assets/icons.svg (SVG-Sprite) aus Lucide-Icons (ISC-Lizenz).
//   npm pack lucide-static && tar xzf lucide-static-*.tgz   →   node tools/build-icons.js package/icons
// Strichstärke/Farbe kommen per CSS (.i in app.css). Enthalten sind die Icons aus UI (Liste unten) und alle `icon: "…"` aus public/assets/trips/*.js.
const fs = require("fs"), path = require("path");
const src = process.argv[2];
if (!src) { console.error("Pfad zu lucide-static/icons angeben"); process.exit(1); }

const UI = ["calendar-days", "map", "list-checks", "chevron-left", "chevron-right", "arrow-up-right", "route", "globe",
  "star", "search", "locate-fixed", "bed-double", "map-pin", "check", "info", "clock", "pencil-line", "footprints",
  "sun", "cloud-sun", "cloud", "cloud-fog", "cloud-drizzle", "cloud-rain", "cloud-snow", "cloud-lightning", "droplet", "wind"];
const dir = path.join(__dirname, "../public/assets/trips");
const fromData = fs.readdirSync(dir).flatMap((f) =>
  [...fs.readFileSync(path.join(dir, f), "utf8").matchAll(/icon: "([a-z0-9-]+)"/g)].map((m) => m[1]));
const names = [...new Set([...UI, ...fromData])].sort();

const symbols = names.map((n) => {
  const svg = fs.readFileSync(path.join(src, n + ".svg"), "utf8");
  const inner = svg.slice(svg.indexOf(">", svg.indexOf("<svg")) + 1, svg.lastIndexOf("</svg>"))
    .replace(/\s*\n\s*/g, "").trim();
  return `<symbol id="${n}" viewBox="0 0 24 24">${inner}</symbol>`;
});
const out = `<svg xmlns="http://www.w3.org/2000/svg"><!-- Lucide (ISC), https://lucide.dev -->\n${symbols.join("\n")}\n</svg>\n`;
fs.writeFileSync(path.join(__dirname, "../public/assets/icons.svg"), out);
console.log(`${names.length} Icons → public/assets/icons.svg (${out.length} Bytes)`);
