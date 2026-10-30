/* ZOYA stats dashboard: password gate, then fetches /api/stats and renders it. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Kept only in sessionStorage: gone when the tab closes, never written to disk permanently.
  const KEY = "zoya_stats_key";
  let days = 30;

  function showGateError(msg) {
    const el = $("#gateError");
    el.textContent = msg;
    el.hidden = false;
  }

  async function loadStats(key) {
    $("#dash").hidden = false;
    $("#gate").hidden = true;
    $("#loading").hidden = false;
    $("#error").hidden = true;
    $("#content").hidden = true;

    const res = await fetch(`/api/stats?days=${days}`, { headers: { "X-Stats-Key": key } });
    const data = await res.json();

    $("#loading").hidden = true;

    if (!res.ok) {
      if (res.status === 401) {
        // Password was wrong or has changed: forget it and go back to the gate
        sessionStorage.removeItem(KEY);
        $("#dash").hidden = true;
        $("#gate").hidden = false;
        showGateError(data.error || "Wrong password.");
        return;
      }
      $("#error").hidden = false;
      $("#error").textContent = data.error || "Something went wrong loading stats.";
      return;
    }

    sessionStorage.setItem(KEY, key);
    render(data);
  }

  function bar(list, valueKey, labelKey, max) {
    if (!list || !list.length) return `<p class="empty">Nothing yet in this period.</p>`;
    const top = max || Math.max(...list.map((r) => Number(r[valueKey]) || 0), 1);
    return list
      .map((r) => {
        const v = Number(r[valueKey]) || 0;
        const pct = Math.max(2, Math.round((v / top) * 100));
        return `<div class="row">
          <span class="row__name">${esc(r[labelKey] || "(unknown)")}</span>
          <span class="row__count">${v.toLocaleString()}</span>
          <span class="row__bar-wrap"><span class="row__bar" style="width:${pct}%"></span></span>
        </div>`;
      })
      .join("");
  }

  function render(data) {
    $("#content").hidden = false;
    $("#numViews").textContent = (data.pageviews || 0).toLocaleString();
    $("#numClicks").textContent = (data.clicks || 0).toLocaleString();
    $("#numCountries").textContent = (data.byCountry || []).length;

    const daily = data.daily || [];
    const maxDay = Math.max(...daily.map((d) => Number(d.count) || 0), 1);
    $("#dailyChart").innerHTML =
      daily
        .map((d) => {
          const v = Number(d.count) || 0;
          const h = Math.max(2, Math.round((v / maxDay) * 100));
          const label = `${d.day}: ${v}`;
          return `<div class="bar" style="height:${h}%" data-label="${esc(label)}"></div>`;
        })
        .join("") || `<p class="empty">No views yet in this period.</p>`;

    const deviceLabel = { mobile: "Mobile", desktop: "Desktop" };
    $("#deviceRows").innerHTML = bar(
      (data.byDevice || []).map((d) => ({ ...d, device: deviceLabel[d.device] || d.device })),
      "count", "device"
    );
    $("#countryRows").innerHTML = bar(data.byCountry, "count", "country");
    $("#releaseRows").innerHTML = bar(data.topReleases, "count", "title");
    $("#platformRows").innerHTML = bar(data.topPlatforms, "count", "platform");
    $("#setRows").innerHTML = bar(data.topSets, "count", "title");
    $("#socialRows").innerHTML = bar(data.bySocial, "count", "platform");
  }

  $("#gate").addEventListener("submit", (e) => {
    e.preventDefault();
    const key = $("#key").value.trim();
    if (!key) return;
    $("#gateError").hidden = true;
    loadStats(key);
  });

  $("#signOut").addEventListener("click", () => {
    sessionStorage.removeItem(KEY);
    $("#dash").hidden = true;
    $("#gate").hidden = false;
    $("#key").value = "";
    $("#key").focus();
  });

  $("#range").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-days]");
    if (!btn) return;
    days = Number(btn.dataset.days);
    $("#range").querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
    const key = sessionStorage.getItem(KEY);
    if (key) loadStats(key);
  });

  // Reuse a password already entered this browser session
  const saved = sessionStorage.getItem(KEY);
  if (saved) loadStats(saved);
})();
