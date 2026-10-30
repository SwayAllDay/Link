// Cloudflare Worker: serves the static page in /public, plus:
//   /api/sets    -> latest sets from a public YouTube playlist feed (no API key)
//   /api/track   -> records one visit/click event to Analytics Engine
//   /api/stats   -> password-protected: reads the aggregated numbers back
//
// Analytics Engine stores raw events (no cookies, no IP addresses) and rolls them
// up server-side. The visitor's country comes from Cloudflare's own request data,
// not from a geo-IP lookup.

import config from "../public/config.json";

const CACHE_SECONDS = 1800;
const UA = "Mozilla/5.0 (compatible; zoya-links/1.0)";

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const method = request.method;

    if ((method === "GET" || method === "HEAD") && pathname === "/api/sets") {
      return cached(request, ctx, () => getSets());
    }
    if (method === "POST" && pathname === "/api/track") {
      return track(request, env);
    }
    if (method === "GET" && pathname === "/api/stats") {
      return stats(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

/* ---------- helpers ---------- */

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", ...headers },
  });
}

async function cached(request, ctx, produce) {
  const cache = caches.default;
  const u = new URL(request.url);
  const key = new Request(u.origin + u.pathname, { method: "GET" });

  const hit = await cache.match(key);
  if (hit) return hit;

  try {
    const data = await produce();
    const response = json(data, 200, { "Cache-Control": `public, max-age=300, s-maxage=${CACHE_SECONDS}` });
    ctx.waitUntil(cache.put(key, response.clone()));
    return response;
  } catch (err) {
    console.error(err);
    return json({ error: String(err && err.message ? err.message : err) }, 502, { "Cache-Control": "no-store" });
  }
}

/* ---------- YouTube ---------- */

const decodeXml = (s = "") =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

function parseFeed(xml) {
  return xml
    .split("<entry>")
    .slice(1)
    .map((entry) => {
      const pick = (re) => (entry.match(re) || [])[1] || "";
      const id = pick(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      return {
        id,
        title: decodeXml(pick(/<title>([^<]*)<\/title>/)).trim(),
        published: pick(/<published>([^<]+)<\/published>/),
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
        thumbnailSmall: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        thumbnailFallback: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      };
    })
    .filter((v) => v.id);
}

async function getSets() {
  const yt = config.youtube || {};
  let feedUrl;
  if (yt.setsPlaylistId) feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(yt.setsPlaylistId)}`;
  else if (yt.channelId) feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(yt.channelId)}`;
  else throw new Error("Set youtube.setsPlaylistId (recommended) or youtube.channelId in public/config.json");

  const res = await fetch(feedUrl, { headers: { "User-Agent": UA }, cf: { cacheTtl: 900, cacheEverything: true } });
  if (!res.ok) throw new Error(`YouTube feed request failed (${res.status}). Is the playlist public?`);

  const filters = (yt.titleFilter || []).map((f) => f.toLowerCase());
  const sets = parseFeed(await res.text())
    .filter((v) => !/#shorts?\b/i.test(v.title))
    .filter((v) => !filters.length || filters.some((f) => v.title.toLowerCase().includes(f)))
    .sort((a, b) => b.published.localeCompare(a.published));

  return { channelUrl: yt.channelId ? `https://www.youtube.com/channel/${yt.channelId}` : "", sets };
}

/* ---------- tracking ---------- */

// What the page is allowed to report. Anything else is dropped rather than trusted blindly.
const EVENT_TYPES = new Set([
  "pageview", "social", "featured_open", "featured_click",
  "release_open", "release_click", "listen_click", "set_click", "bio_expand",
]);

const clip = (s = "", n) => String(s).slice(0, n);

function track(request, env) {
  if (!env.ANALYTICS) return json({ error: "Analytics is not set up yet." }, 501);

  return request
    .json()
    .catch(() => null)
    .then((body) => {
      const type = body && EVENT_TYPES.has(body.type) ? body.type : null;
      if (!type) return json({ error: "unknown event type" }, 400);

      const country = request.cf && request.cf.country ? request.cf.country : "XX";
      const path = clip(body.path || "", 80);
      const target = clip(body.target || "", 80);
      const label = clip(body.label || "", 80);
      const referrerHost = safeHost(body.referrer);
      const device = /Mobi|Android|iPhone|iPad|iPod/i.test(request.headers.get("User-Agent") || "") ? "mobile" : "desktop";

      env.ANALYTICS.writeDataPoint({
        blobs: [type, target, label, country, referrerHost, device, path],
        doubles: [1],
        indexes: [type], // one event type per request keeps sampling accurate within each type
      });

      return json({ ok: true });
    });
}

function safeHost(url = "") {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* ---------- stats dashboard ---------- */

// Simple shared-password gate: fine for one person checking their own numbers,
// not meant to withstand a determined attacker. See README for how it's set.
function authorized(request, env) {
  if (!env.STATS_PASSWORD) return false;
  const key = new URL(request.url).searchParams.get("key") || request.headers.get("X-Stats-Key") || "";
  return key.length > 0 && key === env.STATS_PASSWORD;
}

async function stats(request, env) {
  if (!authorized(request, env)) return json({ error: "Wrong or missing password." }, 401);
  if (!env.CF_ACCOUNT_ID || !env.CF_ANALYTICS_TOKEN) {
    return json({ error: "CF_ACCOUNT_ID or CF_ANALYTICS_TOKEN is not set on the Worker." }, 501);
  }

  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 30));
  const dataset = (config.analyticsDataset) || "zoya_links";

  const sql = (q) => queryAnalyticsEngine(env, q);
  const since = `INTERVAL '${days}' DAY`;

  try {
    const [totals, byCountry, byType, topReleases, topPlatforms, topSets, bySocial, daily] = await Promise.all([
      sql(`SELECT blob1 AS type, SUM(_sample_interval) AS count FROM ${dataset}
           WHERE timestamp > now() - ${since} GROUP BY type`),
      sql(`SELECT blob4 AS country, SUM(_sample_interval) AS count FROM ${dataset}
           WHERE blob1 = 'pageview' AND timestamp > now() - ${since}
           GROUP BY country ORDER BY count DESC LIMIT 10`),
      sql(`SELECT blob6 AS device, SUM(_sample_interval) AS count FROM ${dataset}
           WHERE blob1 = 'pageview' AND timestamp > now() - ${since} GROUP BY device`),
      sql(`SELECT blob2 AS title, SUM(_sample_interval) AS count FROM ${dataset}
           WHERE blob1 IN ('release_open','release_click') AND timestamp > now() - ${since}
           GROUP BY title ORDER BY count DESC LIMIT 10`),
      sql(`SELECT blob3 AS platform, SUM(_sample_interval) AS count FROM ${dataset}
           WHERE blob1 = 'listen_click' AND timestamp > now() - ${since}
           GROUP BY platform ORDER BY count DESC`),
      sql(`SELECT blob2 AS title, SUM(_sample_interval) AS count FROM ${dataset}
           WHERE blob1 = 'set_click' AND timestamp > now() - ${since}
           GROUP BY title ORDER BY count DESC LIMIT 10`),
      sql(`SELECT blob2 AS platform, SUM(_sample_interval) AS count FROM ${dataset}
           WHERE blob1 = 'social' AND timestamp > now() - ${since}
           GROUP BY platform ORDER BY count DESC`),
      sql(`SELECT toDate(timestamp) AS day, SUM(_sample_interval) AS count FROM ${dataset}
           WHERE blob1 = 'pageview' AND timestamp > now() - ${since}
           GROUP BY day ORDER BY day`),
    ]);

    const countOf = (rows, type) => (rows.find((r) => r.type === type) || {}).count || 0;

    return json({
      days,
      pageviews: countOf(totals, "pageview"),
      clicks: totals.reduce((sum, r) => (r.type === "pageview" ? sum : sum + Number(r.count)), 0),
      byCountry,
      byDevice: byType,
      topReleases,
      topPlatforms,
      topSets,
      bySocial,
      daily,
    });
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) }, 502);
  }
}

async function queryAnalyticsEngine(env, sql) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, "Content-Type": "text/plain" },
    body: sql,
  });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error((body && (body.error || body.errors)) || `Analytics query failed (${res.status})`);
  return body.data || [];
}
