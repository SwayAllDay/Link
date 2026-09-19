// Runs before every deploy (Cloudflare build command: npm run check).
// If public/config.json has a mistake, this fails the build, so the live page keeps
// showing the last good version instead of breaking.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const errors = [];
const warnings = [];

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(path.join(publicDir, "config.json"), "utf8"));
} catch (e) {
  console.error(`\nX public/config.json is not valid JSON:\n  ${e.message}`);
  console.error("  Usual causes: a missing or extra comma, a missing quote, or a curly quote instead of a straight one.\n");
  process.exit(1);
}

const PLATFORMS = ["spotify", "apple", "ytmusic", "youtube", "beatport", "soundcloud", "deezer", "amazon", "tidal", "bandcamp"];

// Returns how many usable links were found. Empty strings are allowed and simply ignored.
function checkLinks(where, links) {
  let count = 0;
  Object.entries(links || {}).forEach(([key, url]) => {
    if (!PLATFORMS.includes(key)) {
      errors.push(`${where}: unknown link name "${key}" (allowed: ${PLATFORMS.join(", ")})`);
    } else if (url) {
      if (!isUrl(url)) errors.push(`${where}: links.${key} must start with https://`);
      else count++;
    }
  });
  return count;
}

const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
const isUrl = (u) => /^https?:\/\/\S+$/i.test(u);

function checkImage(where, img, required) {
  if (!img) {
    if (required) errors.push(`${where}: "image" is missing`);
    return;
  }
  if (/^https?:\/\//i.test(img)) return;
  const file = path.join(publicDir, img.replace(/^\//, ""));
  if (!fs.existsSync(file)) {
    errors.push(`${where}: image file not found: public${img.startsWith("/") ? "" : "/"}${img} (names are case-sensitive)`);
    return;
  }
  const kb = fs.statSync(file).size / 1024;
  if (kb > 600) warnings.push(`${where}: ${img} is ${Math.round(kb)} KB. Under ~300 KB loads faster on phones.`);
}

const releases = (cfg.releases && cfg.releases.items) || [];
releases.forEach((r, i) => {
  const where = `releases.items[${i}]${r.title ? ` ("${r.title}")` : ""}`;
  if (!r.title) errors.push(`${where}: "title" is missing`);
  const linkCount = checkLinks(where, r.links);
  if (r.url && !isUrl(r.url)) errors.push(`${where}: "url" must start with https://`);
  if (!linkCount && !r.url) errors.push(`${where}: add at least one link under "links" (for example "spotify")`);
  checkImage(where, r.image, true);
  if (!r.date) warnings.push(`${where}: no "date" (YYYY-MM-DD). Without it the release can't be sorted or get the "New" badge.`);
  else if (!isDate(r.date)) errors.push(`${where}: "date" must look like 2026-05-29`);
});

const sets = (cfg.youtube && cfg.youtube.items) || [];
sets.forEach((s, i) => {
  const where = `youtube.items[${i}]${s.title ? ` ("${s.title}")` : ""}`;
  if (!s.title) errors.push(`${where}: "title" is missing`);
  if (!s.url || !isUrl(s.url)) errors.push(`${where}: "url" must start with https://`);
  checkImage(where, s.image, false);
  if (s.date && !isDate(s.date)) errors.push(`${where}: "date" must look like 2026-08-20`);
});

if (cfg.featured && cfg.featured.links) checkLinks("featured", cfg.featured.links);

(cfg.social || []).forEach((s, i) => {
  if (s.url && !/^(https?:\/\/|mailto:)/i.test(s.url)) errors.push(`social[${i}] (${s.type}): "url" must start with https:// or mailto:`);
});

if (cfg.photo && !/^https?:/i.test(cfg.photo) && !fs.existsSync(path.join(publicDir, cfg.photo.replace(/^\//, "")))) {
  warnings.push(`photo: ${cfg.photo} not found yet. The page will show a plain gradient until you add it.`);
}

warnings.forEach((w) => console.warn(`! ${w}`));
if (errors.length) {
  console.error(`\nX Found ${errors.length} problem${errors.length > 1 ? "s" : ""} in public/config.json:\n`);
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error("\nFix these and commit again. The live page keeps its previous version until then.\n");
  process.exit(1);
}
console.log(`OK config.json looks good (${releases.length} releases, ${sets.length} manual sets)`);
