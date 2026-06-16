// Sunshine Dev — tableau de bord de la fenêtre développeur.
import * as lib from "./lib.js";

const $ = (sel) => document.querySelector(sel);
const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

let ownTabId = null;
let lastRaw = null;
let history = [];

// ---------- Fonctions injectées dans la page cible ----------
// Autonomes (sérialisées par scripting.executeScript) : aucune dépendance.

function collect() {
  const nav = performance.getEntriesByType("navigation")[0] || {};
  const navData = {};
  for (const key of ["startTime", "redirectStart", "redirectEnd",
    "domainLookupStart", "domainLookupEnd", "connectStart", "connectEnd",
    "secureConnectionStart", "requestStart", "responseStart", "responseEnd",
    "domInteractive", "domContentLoadedEventEnd", "domComplete",
    "loadEventEnd"]) {
    navData[key] = nav[key] || 0;
  }
  const paint = {};
  for (const entry of performance.getEntriesByType("paint")) {
    paint[entry.name] = entry.startTime;
  }
  const resourceEntries = performance.getEntriesByType("resource");
  const resources = resourceEntries.slice(0, 1000).map((r) => ({
    name: r.name,
    initiatorType: r.initiatorType,
    transferSize: r.transferSize || 0,
    decodedBodySize: r.decodedBodySize || 0,
    start: r.startTime || 0,
    duration: r.duration || 0,
  }));

  const all = document.getElementsByTagName("*");
  let maxDepth = 0;
  for (let i = 0; i < all.length && i < 4000; i++) {
    let depth = 0;
    let el = all[i];
    while (el && el.parentElement) { depth++; el = el.parentElement; }
    if (depth > maxDepth) maxDepth = depth;
  }

  const colorCounts = {};
  const fonts = new Set();
  const toHex = (value) => {
    const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(value || "");
    if (!m) return null;
    if (m[4] !== undefined && Number(m[4]) === 0) return null;
    return "#" + [m[1], m[2], m[3]]
      .map((x) => Number(x).toString(16).padStart(2, "0")).join("");
  };
  const step = Math.max(1, Math.floor(all.length / 1500));
  for (let i = 0; i < all.length; i += step) {
    const cs = getComputedStyle(all[i]);
    for (const prop of ["color", "backgroundColor"]) {
      const hex = toHex(cs[prop]);
      if (hex) colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }
    const family = (cs.fontFamily || "").split(",")[0].replace(/["']/g, "").trim();
    if (family) fonts.add(family);
  }

  const attr = (sel, name) => {
    const el = document.querySelector(sel);
    return el ? (el.getAttribute(name) || "") : "";
  };
  const headings = {};
  for (let h = 1; h <= 6; h++) headings["h" + h] = document.querySelectorAll("h" + h).length;

  let cookies = 0;
  let ls = 0;
  let ss = 0;
  try { cookies = document.cookie ? document.cookie.split(";").filter(Boolean).length : 0; } catch { /* bloqué */ }
  try { ls = localStorage.length; } catch { /* bloqué */ }
  try { ss = sessionStorage.length; } catch { /* bloqué */ }

  const https = location.protocol === "https:";
  let mixed = 0;
  if (https) {
    for (const r of resourceEntries) {
      if (typeof r.name === "string" && r.name.startsWith("http://")) mixed++;
    }
  }
  let imagesNoAlt = 0;
  for (const img of document.images) if (!img.getAttribute("alt")) imagesNoAlt++;

  // Accessibilité : champs sans étiquette, liens/boutons sans nom accessible.
  const labelFor = new Set();
  for (const l of document.querySelectorAll("label[for]")) {
    labelFor.add(l.getAttribute("for"));
  }
  let inputsNoLabel = 0;
  for (const field of document.querySelectorAll("input, select, textarea")) {
    const type = (field.getAttribute("type") || "").toLowerCase();
    if (["hidden", "submit", "button", "image", "reset"].includes(type)) continue;
    const labelled = (field.id && labelFor.has(field.id))
      || field.closest("label")
      || field.getAttribute("aria-label")
      || field.getAttribute("aria-labelledby")
      || field.getAttribute("title");
    if (!labelled) inputsNoLabel++;
  }
  let linksNoText = 0;
  for (const a of document.links) {
    const named = (a.textContent || "").trim()
      || a.getAttribute("aria-label") || a.getAttribute("title")
      || a.querySelector("img[alt]:not([alt=''])");
    if (!named) linksNoText++;
  }
  let buttonsNoText = 0;
  for (const b of document.querySelectorAll("button")) {
    const named = (b.textContent || "").trim()
      || b.getAttribute("aria-label") || b.getAttribute("title");
    if (!named) buttonsNoText++;
  }

  return {
    url: location.href,
    title: document.title || "",
    screen: {
      w: screen.width, h: screen.height, colorDepth: screen.colorDepth,
      dpr: window.devicePixelRatio,
      orientation: (screen.orientation && screen.orientation.type) || "",
    },
    viewport: { w: window.innerWidth, h: window.innerHeight },
    win: { w: window.outerWidth, h: window.outerHeight },
    nav: navData,
    paint,
    resources,
    dom: {
      elements: all.length, maxDepth,
      images: document.images.length, imagesNoAlt,
      links: document.links.length,
      scripts: document.scripts.length,
      stylesheets: document.styleSheets.length,
      iframes: document.querySelectorAll("iframe").length,
    },
    meta: {
      title: document.title || "",
      description: attr('meta[name="description"]', "content"),
      canonical: attr('link[rel="canonical"]', "href"),
      viewportMeta: !!document.querySelector('meta[name="viewport"]'),
      lang: document.documentElement.getAttribute("lang") || "",
      charset: document.characterSet || "",
      h1Count: headings.h1,
      headings,
    },
    social: {
      ogTitle: attr('meta[property="og:title"]', "content"),
      ogDescription: attr('meta[property="og:description"]', "content"),
      ogImage: attr('meta[property="og:image"]', "content"),
      twitterCard: attr('meta[name="twitter:card"]', "content"),
    },
    a11y: {
      imagesNoAlt, inputsNoLabel, linksNoText, buttonsNoText,
      hasLang: !!document.documentElement.getAttribute("lang"),
      hasTitle: !!(document.title || "").trim(),
    },
    security: {
      https, mixedContent: mixed, cookies, localStorage: ls, sessionStorage: ss,
      csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy" i]'),
    },
    colors: colorCounts,
    fonts: [...fonts].slice(0, 12),
  };
}

function toggleHighlight() {
  const id = "sunshine-dev-outline";
  const existing = document.getElementById(id);
  if (existing) { existing.remove(); return; }
  const style = document.createElement("style");
  style.id = id;
  style.textContent = "* { outline: 1px solid rgba(232,162,60,.55) !important; }";
  document.documentElement.appendChild(style);
}

function toggleInspect() {
  const ID = "sunshine-dev-inspect";
  const existing = document.getElementById(ID);
  if (existing) { existing._cleanup && existing._cleanup(); existing.remove(); return; }
  const tip = document.createElement("div");
  tip.id = ID;
  tip.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;" +
    "background:#3A2E1E;color:#FFF8EE;font:12px/1.4 system-ui,sans-serif;" +
    "padding:3px 7px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.4);" +
    "max-width:60vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  let last = null;
  const move = (event) => {
    const el = event.target;
    if (!el || el === tip) return;
    if (last && last !== el) last.style.outline = last._oldOutline || "";
    if (el !== last) {
      el._oldOutline = el.style.outline;
      el.style.outline = "2px solid #E8A23C";
      last = el;
    }
    const rect = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    let sel = tag;
    if (el.id) sel += "#" + el.id;
    else if (el.className && typeof el.className === "string") {
      const first = el.className.trim().split(/\s+/)[0];
      if (first) sel += "." + first;
    }
    tip.textContent = `${sel} · ${Math.round(rect.width)}×${Math.round(rect.height)}`;
    tip.style.left = Math.min(event.clientX + 12, window.innerWidth - 220) + "px";
    tip.style.top = (event.clientY + 14) + "px";
  };
  document.addEventListener("mousemove", move, true);
  tip._cleanup = () => {
    document.removeEventListener("mousemove", move, true);
    if (last) last.style.outline = last._oldOutline || "";
  };
  document.documentElement.appendChild(tip);
}

// ---------- i18n ----------

function applyI18n() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  }
}

// ---------- Cibles ----------

async function currentWindowTabs() {
  const win = await chrome.windows.getCurrent();
  return chrome.tabs.query({ windowId: win.id });
}

async function populateTargets() {
  const tabs = await currentWindowTabs();
  const select = $("#target");
  const previous = select.value;
  select.replaceChildren();
  const activeOpt = document.createElement("option");
  activeOpt.value = "active";
  activeOpt.textContent = t("activeTabOption");
  select.appendChild(activeOpt);
  for (const tab of tabs) {
    if (tab.id === ownTabId) continue;
    const opt = document.createElement("option");
    opt.value = String(tab.id);
    opt.textContent = (tab.title || tab.url || "").slice(0, 70);
    select.appendChild(opt);
  }
  if (previous) select.value = previous;
}

async function resolveTargetTab() {
  const value = $("#target").value;
  const tabs = await currentWindowTabs();
  if (value && value !== "active") {
    return tabs.find((tab) => tab.id === Number(value)) || null;
  }
  return tabs.find((tab) => tab.active && tab.id !== ownTabId)
      || tabs.find((tab) => tab.id !== ownTabId && /^https?:/.test(tab.url || ""))
      || null;
}

const inspectable = (tab) => !!(tab && /^https?:/.test(tab.url || ""));

// ---------- Analyse et rendu ----------

function setText(id, value) { $("#" + id).textContent = value; }

function showStatus(text) {
  const el = $("#tool-status");
  el.textContent = text;
  setTimeout(() => { el.textContent = ""; }, 2500);
}

async function analyze(record = false) {
  const tab = await resolveTargetTab();
  if (!inspectable(tab)) { showStatus(t("cannotInspect")); return; }
  let result;
  try {
    [{ result }] = await chrome.scripting.executeScript(
      { target: { tabId: tab.id }, func: collect });
  } catch {
    showStatus(t("cannotInspect"));
    return;
  }
  if (!result) { showStatus(t("cannotInspect")); return; }
  lastRaw = result;
  const scores = render(result);
  if (record && scores) await recordHistory(scores);
}

function detailFor(check) {
  if (check.id === "title" || check.id === "description") {
    return t("charsCount", [String(check.value)]);
  }
  if (check.id === "h1") return String(check.value);
  if ((check.id === "lang" || check.id === "charset") && check.value) {
    return check.value;
  }
  return "";
}

function perfDetail(check) { return lib.formatMs(check.value); }
function a11yDetail(check) { return check.value ? String(check.value) : ""; }

// Rendu générique d'une liste de contrôles (SEO / perf / a11y) + badge de
// note. Retourne le score (0–100) pour le calcul du score global.
function renderChecks(listId, gradeId, checks, prefix, detailFn) {
  const list = document.getElementById(listId);
  list.replaceChildren();
  for (const check of checks) {
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "dot " + check.status;
    const label = document.createElement("span");
    label.textContent = t(`${prefix}_${check.id}`);
    li.append(dot, label);
    const detail = detailFn ? detailFn(check) : "";
    if (detail) {
      const span = document.createElement("span");
      span.className = "detail";
      span.textContent = detail;
      li.appendChild(span);
    }
    list.appendChild(li);
  }
  const grade = lib.gradeFromChecks(checks);
  const badge = document.getElementById(gradeId);
  badge.hidden = false;
  badge.textContent = `${grade.grade} · ${grade.score}`;
  return grade.score;
}

function renderWaterfall(resources) {
  const box = $("#waterfall");
  box.replaceChildren();
  const wf = lib.buildWaterfall(resources, 12);
  if (!wf.rows.length) { box.textContent = t("waterfallEmpty"); return; }
  for (const row of wf.rows) {
    const line = document.createElement("div");
    line.className = "wf-row";
    const label = document.createElement("span");
    label.className = "wf-label";
    label.textContent = lib.shortenUrl(row.name, 24);
    label.title = row.name;
    const track = document.createElement("span");
    track.className = "wf-track";
    const bar = document.createElement("span");
    bar.className = "wf-bar t-" + row.type;
    bar.style.marginLeft = row.offsetPct + "%";
    bar.style.width = row.widthPct + "%";
    track.appendChild(bar);
    const dur = document.createElement("span");
    dur.className = "wf-dur";
    dur.textContent = lib.formatMs(row.duration);
    line.append(label, track, dur);
    box.appendChild(line);
  }
}

function renderHistory() {
  const box = $("#history");
  box.replaceChildren();
  if (!history.length) { box.textContent = t("historyEmpty"); return; }
  for (const rec of history.slice(0, 8)) {
    const li = document.createElement("li");
    const time = document.createElement("span");
    time.className = "h-time";
    time.textContent = new Date(rec.ts).toLocaleTimeString(undefined,
      { hour: "2-digit", minute: "2-digit" });
    const url = document.createElement("span");
    url.className = "h-url";
    url.textContent = lib.shortenUrl(rec.url, 30);
    url.title = rec.url;
    const score = document.createElement("span");
    score.className = "h-score";
    score.textContent = String(rec.overall);
    li.append(time, url, score);
    if (typeof rec.delta === "number" && rec.delta !== 0) {
      const delta = document.createElement("span");
      delta.className = "h-delta " + (rec.delta > 0 ? "up" : "down");
      delta.textContent = lib.formatDelta(rec.delta);
      li.appendChild(delta);
    }
    box.appendChild(li);
  }
}

async function recordHistory(scores) {
  const previous = lib.lastForUrl(history, scores.url);
  const delta = previous ? lib.scoreDelta(previous, scores).overall : null;
  history = lib.pushHistory(history, {
    ts: Date.now(), url: scores.url, overall: scores.overall,
    seo: scores.seo, perf: scores.perf, a11y: scores.a11y, delta,
  });
  await chrome.storage.local.set({ devHistory: history });
  renderHistory();
}

function renderSocial(social = {}) {
  const box = $("#social");
  box.replaceChildren();
  const hasData = social.ogTitle || social.ogDescription || social.ogImage
    || social.twitterCard;
  if (!hasData) { box.textContent = t("socialNoData"); return; }
  if (social.ogImage) {
    const img = document.createElement("img");
    img.className = "og-img";
    img.referrerPolicy = "no-referrer";
    img.src = social.ogImage;
    img.onerror = () => img.remove();
    box.appendChild(img);
  }
  const title = document.createElement("div");
  title.className = "og-title";
  title.textContent = social.ogTitle || "—";
  box.appendChild(title);
  if (social.ogDescription) {
    const desc = document.createElement("div");
    desc.className = "og-desc";
    desc.textContent = social.ogDescription;
    box.appendChild(desc);
  }
  if (social.twitterCard) {
    const card = document.createElement("div");
    card.className = "og-card";
    card.textContent = `Twitter: ${social.twitterCard}`;
    box.appendChild(card);
  }
}

function render(d) {
  $("#empty").hidden = true;
  $("#results").hidden = false;

  setText("v-window", `${d.win.w} × ${d.win.h}`);
  setText("v-viewport", `${d.viewport.w} × ${d.viewport.h}`);
  setText("v-screen", `${d.screen.w} × ${d.screen.h}`);
  setText("v-dpr", String(d.screen.dpr));
  setText("v-colordepth", `${d.screen.colorDepth}-bit`);
  setText("v-orientation", d.screen.orientation || "—");

  const tb = lib.timingBreakdown(d.nav);
  for (const [id, key] of [["v-redirect", "redirect"], ["v-dns", "dns"],
    ["v-tcp", "tcp"], ["v-tls", "tls"], ["v-ttfb", "ttfb"],
    ["v-download", "download"], ["v-dominteractive", "domInteractive"],
    ["v-dcl", "domContentLoaded"], ["v-load", "load"]]) {
    setText(id, lib.formatMs(tb[key]));
  }
  const fcp = d.paint["first-contentful-paint"];
  setText("v-fcp", fcp ? lib.formatMs(fcp) : "—");
  const perfScore = renderChecks("perf-list", "grade-perf",
    lib.perfChecks({ ttfb: tb.ttfb, fcp: fcp || 0, load: tb.load }),
    "perf", perfDetail);

  const rg = lib.groupResources(d.resources);
  const body = $("#res-rows");
  body.replaceChildren();
  for (const group of rg.groups) {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    name.textContent = t(`resType_${group.type}`);
    const count = document.createElement("td");
    count.textContent = String(group.count);
    const size = document.createElement("td");
    size.textContent = lib.formatBytes(group.transfer);
    tr.append(name, count, size);
    body.appendChild(tr);
  }
  setText("v-rescount", String(rg.count));
  setText("v-restransfer", lib.formatBytes(rg.totalTransfer));
  const heavy = $("#heaviest");
  heavy.replaceChildren();
  for (const r of lib.heaviestResources(d.resources, 5)) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = lib.shortenUrl(r.name);
    name.title = r.name;
    const size = document.createElement("span");
    size.className = "sz";
    size.textContent = lib.formatBytes(r.transfer);
    li.append(name, size);
    heavy.appendChild(li);
  }
  renderWaterfall(d.resources);

  setText("v-elements", String(d.dom.elements));
  setText("v-maxdepth", String(d.dom.maxDepth));
  setText("v-images", String(d.dom.images));
  setText("v-imagesnoalt", String(d.dom.imagesNoAlt));
  setText("v-links", String(d.dom.links));
  setText("v-scripts", String(d.dom.scripts));
  setText("v-stylesheets", String(d.dom.stylesheets));
  setText("v-iframes", String(d.dom.iframes));

  const seoScore = renderChecks("seo-list", "grade-seo",
    lib.seoChecks(d.meta), "seo", detailFor);
  const a11yScore = renderChecks("a11y-list", "grade-a11y",
    lib.a11yChecks(d.a11y), "a11y", a11yDetail);
  renderSocial(d.social);

  setText("v-https", d.security.https ? t("yes") : t("no"));
  setText("v-mixed", String(d.security.mixedContent));
  setText("v-cookies", String(d.security.cookies));
  setText("v-localstorage", String(d.security.localStorage));
  setText("v-sessionstorage", String(d.security.sessionStorage));
  setText("v-csp", d.security.csp ? t("yes") : t("no"));

  const palette = $("#palette");
  palette.replaceChildren();
  for (const { color } of lib.topColors(d.colors, 10)) {
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = color;
    swatch.title = color;
    palette.appendChild(swatch);
  }
  setText("v-fonts", d.fonts.length ? d.fonts.join(", ") : "—");

  const overall = lib.overallScore(
    { seo: seoScore, perf: perfScore, a11y: a11yScore });
  const overallBadge = $("#overall");
  overallBadge.hidden = false;
  overallBadge.textContent = `${overall.grade} · ${overall.score}`;

  return { url: d.url, overall: overall.score,
           seo: seoScore, perf: perfScore, a11y: a11yScore };
}

// ---------- Test responsive ----------

function buildBreakpoints() {
  const box = $("#breakpoints");
  box.replaceChildren();
  for (const bp of lib.BREAKPOINTS) {
    const button = document.createElement("button");
    button.textContent = `${bp.width} × ${bp.height}`;
    button.addEventListener("click", () => openResponsive(bp));
    box.appendChild(button);
  }
}

async function openResponsive(bp) {
  const tab = await resolveTargetTab();
  const url = (tab && tab.url) || (lastRaw && lastRaw.url);
  if (!url || !/^https?:/.test(url)) { showStatus(t("cannotInspect")); return; }
  const size = lib.outerSize(bp.width, bp.height, $("#rotate").checked);
  chrome.windows.create(
    { url, type: "popup", width: size.width, height: size.height });
}

// ---------- Rapport ----------

function buildReport(d) {
  const tb = lib.timingBreakdown(d.nav);
  const rg = lib.groupResources(d.resources);
  const grade = lib.gradeFromChecks(lib.seoChecks(d.meta));
  return {
    title: d.title,
    url: d.url,
    grade: `${grade.grade} (${grade.score}/100)`,
    sections: [
      { title: t("secWindow"), rows: [
        [t("mViewport"), `${d.viewport.w} × ${d.viewport.h}`],
        [t("mDpr"), String(d.screen.dpr)],
      ] },
      { title: t("secPerf"), rows: [
        [t("mTtfb"), lib.formatMs(tb.ttfb)],
        [t("mDcl"), lib.formatMs(tb.domContentLoaded)],
        [t("mLoad"), lib.formatMs(tb.load)],
      ] },
      { title: t("secResources"), rows: [
        [t("mResTotal"), `${rg.count} · ${lib.formatBytes(rg.totalTransfer)}`],
      ] },
      { title: t("secDom"), rows: [
        [t("mElements"), String(d.dom.elements)],
        [t("mImagesNoAlt"), String(d.dom.imagesNoAlt)],
      ] },
      { title: t("secSecurity"), rows: [
        [t("mHttps"), d.security.https ? t("yes") : t("no")],
        [t("mMixed"), String(d.security.mixedContent)],
      ] },
    ],
  };
}

// ---------- Vérificateur de contraste ----------

function updateContrast() {
  const ratio = lib.contrastRatio($("#c-fg").value, $("#c-bg").value);
  const level = lib.wcagLevel(ratio);
  const result = $("#c-result");
  result.textContent = ratio != null ? `${ratio}:1 · ${level}` : "—";
  result.className = "c-result " + (level === "—" ? "fail" : "ok");
}

// ---------- Initialisation ----------

let autoTimer = null;

async function init() {
  applyI18n();
  const own = await chrome.tabs.getCurrent();
  ownTabId = own ? own.id : null;
  await populateTargets();
  await loadHistory();
  buildBreakpoints();
  updateContrast();

  $("#analyze").addEventListener("click", () => analyze(true));
  $("#highlight").addEventListener("click", () => runTool(toggleHighlight));
  $("#inspect").addEventListener("click", () => runTool(toggleInspect));
  $("#copy").addEventListener("click", () => copyReport(lib.reportToMarkdown));
  $("#copy-json").addEventListener("click", () => copyReport(lib.reportToJson));
  $("#history-clear").addEventListener("click", async (event) => {
    event.preventDefault();
    history = [];
    await chrome.storage.local.remove("devHistory");
    renderHistory();
  });
  $("#c-fg").addEventListener("input", updateContrast);
  $("#c-bg").addEventListener("input", updateContrast);
  $("#auto").addEventListener("change", () => {
    if ($("#auto").checked) autoTimer = setInterval(() => analyze(false), 5000);
    else if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  });
  chrome.tabs.onUpdated.addListener(populateTargets);
  chrome.tabs.onRemoved.addListener(populateTargets);

  analyze(true);
}

async function loadHistory() {
  const { devHistory } = await chrome.storage.local.get("devHistory");
  history = devHistory || [];
  renderHistory();
}

async function runTool(func) {
  const tab = await resolveTargetTab();
  if (!inspectable(tab)) { showStatus(t("cannotInspect")); return; }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func });
  } catch { showStatus(t("cannotInspect")); }
}

async function copyReport(serialize) {
  if (!lastRaw) return;
  try {
    await navigator.clipboard.writeText(serialize(buildReport(lastRaw)));
    showStatus(t("copied"));
  } catch { /* presse-papiers indisponible */ }
}

init();
