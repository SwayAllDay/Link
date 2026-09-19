// Cloudflare Worker: serves the static page in /public plus one small JSON endpoint
//   /api/sets  -> latest sets + thumbnails from a public YouTube playlist feed (no API key needed)
// The result is cached at the edge for 30 minutes, so YouTube is barely touched.

import config from "../public/config.json";

const CACHE_SECONDS = 1800;
const UA = "Mozilla/5.0 (compatible; zoya-links/1.0)";

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if ((request.method === "GET" || request.method === "HEAD") && pathname === "/api/sets") {
      return cached(request, ctx, () => getSets());
    }

    return env.ASSETS.fetch(request);
  },
};

/* ---------- helpers ---------- */

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
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
    const response = json(data, 200, {
      "Cache-Control": `public, max-age=300, s-maxage=${CACHE_SECONDS}`,
    });
    ctx.waitUntil(cache.put(key, response.clone()));
    return response;
  } catch (err) {
    console.error(err);
    return json({ error: String(err && err.message ? err.message : err) }, 502, {
      "Cache-Control": "no-store",
    });
  }
}

/* ---------- YouTube ---------- */

const decodeXml = (s = "") =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

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
  if (yt.setsPlaylistId) {
    feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(yt.setsPlaylistId)}`;
  } else if (yt.channelId) {
    feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(yt.channelId)}`;
  } else {
    throw new Error("Set youtube.setsPlaylistId (recommended) or youtube.channelId in public/config.json");
  }

  const res = await fetch(feedUrl, {
    headers: { "User-Agent": UA },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`YouTube feed request failed (${res.status}). Is the playlist public?`);

  const filters = (yt.titleFilter || []).map((f) => f.toLowerCase());
  const sets = parseFeed(await res.text())
    .filter((v) => !/#shorts?\b/i.test(v.title))
    .filter((v) => !filters.length || filters.some((f) => v.title.toLowerCase().includes(f)))
    .sort((a, b) => b.published.localeCompare(a.published));

  return {
    channelUrl: yt.channelId ? `https://www.youtube.com/channel/${yt.channelId}` : "",
    sets,
  };
}
