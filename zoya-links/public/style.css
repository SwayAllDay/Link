/* ZOYA links: builds the page from /config.json and the two /api endpoints. */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  /* ---------- small helpers ---------- */

  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u = "") => (/^(https?:\/\/|mailto:)/i.test(u) ? u : "#");
  const safeImg = (u = "") => (/^(https?:\/\/|\/)/i.test(u) ? u : "");
  const filled = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== "" && v != null));

  async function getJSON(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[links] ${url} failed:`, err);
      return null;
    }
  }

  const monthYear = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });
  const formatDate = (iso) => (iso ? monthYear.format(new Date(iso)) : "");
  const daysSince = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000;
  const typeLabel = { single: "Single", ep: "EP", album: "Album", remix: "Remix", compilation: "Compilation" };
  const labelFor = (t = "") => typeLabel[String(t).toLowerCase()] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : "Release");

  /* ---------- listen popup ---------- */

  // Order here is the order buttons appear in the popup
  const PLATFORMS = [
    ["spotify", "Spotify"],
    ["apple", "Apple Music"],
    ["ytmusic", "YouTube Music"],
    ["youtube", "YouTube"],
    ["beatport", "Beatport"],
    ["soundcloud", "SoundCloud"],
    ["deezer", "Deezer"],
    ["amazon", "Amazon Music"],
    ["tidal", "Tidal"],
    ["bandcamp", "Bandcamp"],
  ];
  const cleanLinks = (obj = {}) =>
    Object.fromEntries(PLATFORMS.filter(([k]) => /^https?:\/\//i.test((obj && obj[k]) || "")).map(([k]) => [k, obj[k]]));

  const popups = []; // items that open the popup; elements point at them with data-popup="index"
  const registerPopup = (item) => popups.push(item) - 1;

  function openPopup(dlg, item) {
    const cover = $("#popup-cover");
    cover.src = item.image;
    cover.alt = `Cover art for ${item.name}`;
    $("#popup-title").textContent = item.name;
    $("#popup-artist").textContent = item.artist || "";
    $("#popup-links").innerHTML = PLATFORMS.filter(([k]) => item.links[k])
      .map(([k, label]) => `<a class="popup__link" href="${esc(safeUrl(item.links[k]))}" target="_blank" rel="noopener">${esc(label)}</a>`)
      .join("");
    dlg.showModal();
  }

  function setupPopup() {
    const dlg = $("#popup");
    if (!dlg || typeof dlg.showModal !== "function") return; // very old browsers just follow the plain link

    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const trigger = e.target.closest("[data-popup]");
      const item = trigger && popups[Number(trigger.dataset.popup)];
      if (!item) return;
      e.preventDefault();
      openPopup(dlg, item);
    });
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }); // click on the dark backdrop
    $("#popup-close").addEventListener("click", () => dlg.close());
  }

  /* ---------- icons ---------- */

  const stroke = (inner) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const solid = (inner) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${inner}</svg>`;

  const ICONS = {
    instagram: stroke(`<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>`),
    youtube: solid(`<path fill-rule="evenodd" d="M6.5 5h11A4.5 4.5 0 0 1 22 9.5v5a4.5 4.5 0 0 1-4.5 4.5h-11A4.5 4.5 0 0 1 2 14.5v-5A4.5 4.5 0 0 1 6.5 5zM10 9v6l5.2-3z"/>`),
    spotify: solid(`<circle cx="12" cy="12" r="10"/><g fill="none" stroke-linecap="round" style="stroke:var(--cut)"><path stroke-width="2" d="M6.6 9.2c3.8-1.1 8-.7 11.3 1.2"/><path stroke-width="1.7" d="M7.3 12.4c3.2-.9 6.5-.5 9.3 1"/><path stroke-width="1.4" d="M8 15.4c2.5-.6 4.8-.3 6.9.8"/></g>`),
    facebook: solid(`<path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.3-1.5 1.6-1.5h1.7V3.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V13h2.8v8z"/>`),
    soundcloud: solid(`<rect x="2" y="12" width="1.6" height="5.5" rx=".8"/><rect x="4.6" y="10" width="1.6" height="7.5" rx=".8"/><rect x="7.2" y="8.5" width="1.6" height="9" rx=".8"/><path d="M9.8 17.5V8.1A6 6 0 0 1 13 7c3 0 5.4 2.2 5.7 5A3.25 3.25 0 0 1 18.4 17.5z"/>`),
    tiktok: stroke(`<path stroke-width="2.2" d="M14.2 3.5v10.2a3.7 3.7 0 1 1-3.7-3.7"/><path stroke-width="2.2" d="M14.2 3.5c.3 2.4 2 4.1 4.6 4.4"/>`),
    music: stroke(`<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>`),
    globe: stroke(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>`),
    mail: stroke(`<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 8 8 6 8-6"/>`),
    link: stroke(`<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>`),
    play: solid(`<path d="M8 5.5v13l11-6.5z"/>`),
  };
  const ALIASES = { applemusic: "music", beatport: "music", bandcamp: "music", website: "globe", web: "globe", email: "mail", featurefm: "link", smartlink: "link" };
  const NICE = { instagram: "Instagram", youtube: "YouTube", spotify: "Spotify", facebook: "Facebook", soundcloud: "SoundCloud", tiktok: "TikTok", applemusic: "Apple Music", beatport: "Beatport", bandcamp: "Bandcamp", featurefm: "Smart link", email: "Email", website: "Website" };
  const iconFor = (type) => ICONS[type] || ICONS[ALIASES[type]] || ICONS.link;

  /* ---------- top of the page ---------- */

  function renderTop(cfg) {
    const logo = $("#logo"); // the ZOYA logo image; if it failed to load the page swaps in the name as text
    if (logo) logo.alt = cfg.name || "ZOYA";
    else if (cfg.name) $("#name").textContent = cfg.name;
    if (cfg.handle) $("#handle").textContent = cfg.handle;
    if (cfg.name) document.title = `${cfg.name} | Links`;

    const heroImg = $("#heroImg"); // removed by the page itself if the photo file is missing
    if (cfg.photo && cfg.photo !== "/images/zoya.jpg") {
      if (heroImg) heroImg.src = cfg.photo;
      document.documentElement.style.setProperty("--photo", `url("${cfg.photo}")`);
    }
    if (cfg.photoPosition && heroImg) heroImg.style.objectPosition = cfg.photoPosition;

    $("#socials").innerHTML = (cfg.social || [])
      .filter((s) => s.url)
      .map((s) => {
        const label = s.label || NICE[s.type] || s.type;
        const external = /^https?:/i.test(s.url);
        return `<li><a href="${esc(safeUrl(s.url))}" aria-label="${esc(label)}" title="${esc(label)}"${external ? ' target="_blank" rel="noopener"' : ""}>${iconFor(s.type)}</a></li>`;
      })
      .join("");

    // Bio: "bio" is always visible; "bioMore" (a list of paragraphs) opens under a Read more button
    const para = (t) => `<p>${esc(t)}</p>`;
    const lead = String(cfg.bio || "").split(/\n{2,}/).filter(Boolean);
    const more = [].concat(cfg.bioMore || []).map(String).filter(Boolean);
    const bioEl = $("#bio");
    if (!lead.length && !more.length) {
      bioEl.remove();
    } else {
      bioEl.innerHTML =
        `<div class="bio__lead">${lead.map(para).join("")}</div>` +
        (more.length
          ? `<div class="bio__more" id="bio-more"><div>${more.map(para).join("")}</div></div>
             <button class="bio__toggle" type="button" aria-expanded="false" aria-controls="bio-more">Read more</button>`
          : "");
      if (more.length) {
        const panel = $("#bio-more"), btn = $(".bio__toggle");
        btn.addEventListener("click", () => {
          const open = panel.classList.toggle("is-open");
          btn.setAttribute("aria-expanded", String(open));
          btn.textContent = open ? "Show less" : "Read more";
        });
      }
    }

    $("#foot").textContent = `© ${new Date().getFullYear()} ${cfg.name || ""}`.trim();
  }

  /* ---------- featured ---------- */

  function renderFeatured(cfg, releases) {
    const el = $("#featured");
    const f = cfg.featured;
    if (!f) return el.remove();

    let item = filled(f);
    let popup = null;

    if (f.auto === "latest-release" && releases.length) {
      const r = releases[0];
      const sub = [labelFor(r.type), r.year].filter(Boolean).join(", ");
      item = { badge: "New release", button: "Listen now", title: r.name, subtitle: sub, image: r.image, url: r.url, ...item };
      if (!f.url && Object.keys(r.links).length > 1) popup = r;
    } else if (f.links) {
      // Manual featured item with its own set of links
      const links = cleanLinks(f.links);
      if (Object.keys(links).length > 1) popup = { name: item.title, artist: cfg.name, image: item.image, links };
      if (!item.url) item.url = Object.values(links)[0];
    }
    if (!item.title || !item.url) return el.remove();

    const img = safeImg(item.image);
    el.href = safeUrl(item.url);
    el.target = /^https?:/i.test(item.url) ? "_blank" : "";
    el.rel = "noopener";
    el.classList.remove("skeleton");
    el.removeAttribute("aria-busy");
    if (popup && img) el.dataset.popup = registerPopup(popup);
    el.innerHTML = `
      ${img ? `<img class="featured__img" src="${esc(img)}" alt="" decoding="async">` : ""}
      ${item.badge ? `<span class="featured__badge">${esc(item.badge)}</span>` : ""}
      <span class="featured__row">
        <span>
          <span class="featured__title">${esc(item.title)}</span>
          ${item.subtitle ? `<span class="featured__sub">${esc(item.subtitle)}</span>` : ""}
        </span>
        <span class="btn">${esc(item.button || "Open")}</span>
      </span>`;
  }

  /* ---------- releases ---------- */

  // Releases come straight from config.json (cover art files live in /images/releases)
  function getReleases(cfg) {
    const items = (cfg.releases && cfg.releases.items) || [];
    return items
      .map((r) => {
        const links = cleanLinks(r.links);
        return {
          name: r.title,
          artist: r.artist || cfg.name || "",
          type: r.type || "",
          releaseDate: r.date || "",
          year: (r.date || "").slice(0, 4),
          image: r.image,
          links,
          // With one link the cover goes straight there; with several it opens the popup
          url: Object.values(links)[0] || r.url || "",
        };
      })
      .filter((r) => r.name && r.image && r.url)
      .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)); // newest first; undated keep file order
  }

  function renderReleases(cfg, list) {
    const section = $("#releases");
    if (!list.length) return section.remove();

    const limit = (cfg.releases && cfg.releases.limit) || 8;
    $("#releases-rail").innerHTML = list
      .slice(0, limit)
      .map((r) => {
        const isNew = r.releaseDate && daysSince(r.releaseDate) <= 45;
        const meta = [labelFor(r.type), r.year].filter(Boolean).join(", ");
        const popupAttr = Object.keys(r.links).length > 1 ? ` data-popup="${registerPopup(r)}"` : "";
        return `
        <a class="release" href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener" draggable="false"${popupAttr}>
          <span class="release__art">
            <img src="${esc(r.image)}" alt="" width="304" height="304" loading="lazy" draggable="false">
            ${isNew ? '<span class="pill">New</span>' : ""}
          </span>
          <span class="release__title">${esc(r.name)}</span>
          <span class="release__meta">${esc(meta)}</span>
        </a>`;
      })
      .join("");

    const more = cfg.releases && cfg.releases.moreUrl;
    if (more) {
      const link = $("#releases-link");
      link.href = safeUrl(more);
      link.textContent = cfg.releases.moreLabel || "See all";
      link.hidden = false;
    }
    enableDragScroll($("#releases-rail"));
  }

  // Lets desktop users drag the row with a mouse (touch and trackpads scroll natively)
  function enableDragScroll(rail) {
    let down = false, moved = false, startX = 0, startLeft = 0;
    rail.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; rail.classList.add("is-dragging"); }
      rail.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      rail.classList.remove("is-dragging");
    });
    rail.addEventListener("click", (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
  }

  /* ---------- sets ---------- */

  const ytId = (u = "") => (u.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([\w-]{11})/) || [])[1] || "";

  // Hand-picked sets from config.json, shown in the order you list them (the first one is the big one).
  // Without an image, YouTube's own thumbnail is used.
  function manualSets(yt) {
    const sets = yt.items
      .map((s) => {
        const id = ytId(s.url);
        const local = safeImg(s.image || "");
        return {
          id,
          title: s.title,
          published: s.date || "",
          url: s.url,
          thumbnail: local || (id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : ""),
          thumbnailSmall: local || (id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : ""),
          thumbnailFallback: local || !id ? "" : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        };
      })
      .filter((s) => s.title && s.url && s.thumbnail); // keep the order you wrote in config.json
    return { channelUrl: yt.channelId ? `https://www.youtube.com/channel/${yt.channelId}` : "", sets };
  }

  function renderSets(cfg, data) {
    const section = $("#sets");
    const list = data && data.sets;
    if (!list || !list.length) return section.remove();

    const limit = (cfg.youtube && cfg.youtube.limit) || 4;
    const items = list.slice(0, limit);

    const card = (v, i) => {
      const lead = i === 0;
      const src = lead ? v.thumbnail : v.thumbnailSmall || v.thumbnail;
      return `
      <a class="set ${lead ? "set--lead" : "set--row"}" href="${esc(safeUrl(v.url))}" target="_blank" rel="noopener">
        <span class="set__thumb">
          <img src="${esc(src)}"${v.thumbnailFallback ? ` data-fallback="${esc(v.thumbnailFallback)}"` : ""} alt="" loading="${lead ? "eager" : "lazy"}">
          <span class="set__play">${ICONS.play}</span>
        </span>
        <span class="set__info">
          <span class="set__title">${esc(v.title)}</span>
          <span class="set__meta">${esc(formatDate(v.published))}</span>
        </span>
      </a>`;
    };

    const box = $("#sets-list");
    box.innerHTML = items.map(card).join("");

    // maxresdefault doesn't exist for every video. YouTube answers with a 404 or a
    // tiny 120px placeholder, so swap in the standard thumbnail in either case.
    box.querySelectorAll("img[data-fallback]").forEach((img) => {
      const useFallback = () => {
        const fb = img.dataset.fallback;
        if (fb && img.src !== fb) img.src = fb;
      };
      img.addEventListener("error", useFallback);
      img.addEventListener("load", () => { if (img.naturalWidth <= 120) useFallback(); });
    });

    if (data.channelUrl) {
      const link = $("#sets-link");
      link.href = data.channelUrl;
      link.hidden = false;
    }
  }

  /* ---------- boot ---------- */

  async function boot() {
    const cfg = await getJSON("/config.json");
    if (!cfg) return;

    renderTop(cfg);
    setupPopup();

    const releases = getReleases(cfg);
    // When the featured card shows the newest release, don't repeat it in the row below
    const featuredIsLatest = cfg.featured && cfg.featured.auto === "latest-release" && !cfg.featured.url && releases.length > 0;
    renderReleases(cfg, featuredIsLatest ? releases.slice(1) : releases);
    renderFeatured(cfg, releases);

    const yt = cfg.youtube || {};
    if (yt.items && yt.items.length) renderSets(cfg, manualSets(yt));
    else if (yt.setsPlaylistId || yt.channelId) getJSON("/api/sets").then((data) => renderSets(cfg, data));
    else $("#sets").remove();
  }

  boot();
})();
