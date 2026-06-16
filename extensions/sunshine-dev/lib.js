// Sunshine Dev — logique pure du mode développeur (partagée avec les tests).
// Ces fonctions transforment les données brutes collectées dans la page
// (via collect() injecté) en valeurs prêtes à afficher. Aucune dépendance DOM.

// ---------- Formats ----------

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatMs(ms) {
  const n = Math.max(0, Math.round(Number(ms) || 0));
  if (n < 1000) return `${n} ms`;
  return `${(n / 1000).toFixed(2)} s`;
}

// "rgb(232, 162, 60)" → "#e8a23c" ; null si la valeur n'est pas un rgb().
export function rgbToHex(value) {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(String(value || ""));
  if (!m) return null;
  return "#" + [m[1], m[2], m[3]]
    .map((x) => Number(x).toString(16).padStart(2, "0")).join("");
}

// Raccourcit une URL de ressource pour l'affichage (nom de fichier ou hôte).
export function shortenUrl(url, max = 42) {
  let s = String(url || "");
  try {
    const u = new URL(s);
    s = u.pathname === "/" ? u.hostname : (u.pathname.split("/").pop() || u.hostname);
  } catch { /* garde la chaîne brute */ }
  if (!s) s = String(url || "");
  return s.length > max ? "…" + s.slice(-max) : s;
}

// ---------- Contraste (WCAG) ----------

// "#rgb" | "#rrggbb" | "rgb()/rgba()" → [r, g, b] ; null sinon.
export function parseColor(value) {
  const v = String(value || "").trim();
  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = /^#([0-9a-f]{3})$/i.exec(v);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16));
  m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(v);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

function relativeLuminance([r, g, b]) {
  const channel = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

// Ratio de contraste WCAG entre deux couleurs (1 à 21), null si invalide.
export function contrastRatio(color1, color2) {
  const a = parseColor(color1);
  const b = parseColor(color2);
  if (!a || !b) return null;
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

// Niveau WCAG atteint pour un ratio : "AAA" | "AA" | "—".
export function wcagLevel(ratio, largeText = false) {
  if (ratio == null) return "—";
  const aa = largeText ? 3 : 4.5;
  const aaa = largeText ? 4.5 : 7;
  if (ratio >= aaa) return "AAA";
  if (ratio >= aa) return "AA";
  return "—";
}

// ---------- Performance (Navigation Timing niveau 2) ----------

// Décompose une entrée de navigation en phases (ms, jamais négatives).
export function timingBreakdown(nav) {
  const span = (a, b) =>
    Math.max(0, (Number(nav?.[a]) || 0) - (Number(nav?.[b]) || 0));
  const start = Number(nav?.startTime) || 0;
  const rel = (a) => Math.max(0, (Number(nav?.[a]) || 0) - start);
  const secure = Number(nav?.secureConnectionStart) || 0;
  const tls = secure > 0
    ? Math.max(0, (Number(nav?.connectEnd) || 0) - secure) : 0;
  return {
    redirect: span("redirectEnd", "redirectStart"),
    dns: span("domainLookupEnd", "domainLookupStart"),
    tcp: span("connectEnd", "connectStart"),
    tls,
    ttfb: span("responseStart", "requestStart"),
    download: span("responseEnd", "responseStart"),
    domInteractive: rel("domInteractive"),
    domContentLoaded: rel("domContentLoadedEventEnd"),
    domComplete: rel("domComplete"),
    load: rel("loadEventEnd") || rel("domComplete"),
  };
}

// Type de ressource → catégorie affichée.
const RESOURCE_BUCKET = {
  script: "script", link: "css", css: "css",
  img: "image", image: "image", imageset: "image",
  fetch: "fetch", xmlhttprequest: "fetch", beacon: "fetch",
  font: "font", video: "media", audio: "media", track: "media",
};

// Regroupe les ressources par catégorie avec totaux (poids transféré/décodé).
export function groupResources(entries) {
  const groups = {};
  let count = 0;
  let totalTransfer = 0;
  let totalDecoded = 0;
  for (const entry of entries || []) {
    const type = RESOURCE_BUCKET[entry.initiatorType] || "other";
    const group = (groups[type] ||= { type, count: 0, transfer: 0, decoded: 0 });
    const transfer = Number(entry.transferSize) || 0;
    const decoded = Number(entry.decodedBodySize) || 0;
    group.count++;
    group.transfer += transfer;
    group.decoded += decoded;
    count++;
    totalTransfer += transfer;
    totalDecoded += decoded;
  }
  const list = Object.values(groups).sort((a, b) => b.transfer - a.transfer);
  return { groups: list, count, totalTransfer, totalDecoded };
}

// Les `n` ressources les plus lourdes (poids transféré décroissant).
export function heaviestResources(entries, n = 5) {
  return (entries || [])
    .map((e) => ({ name: e.name || "", transfer: Number(e.transferSize) || 0 }))
    .filter((e) => e.transfer > 0)
    .sort((a, b) => b.transfer - a.transfer)
    .slice(0, n);
}

// ---------- Budget performance ----------

// Évalue les métriques clés contre des seuils usuels (ms).
export function perfChecks({ ttfb = 0, fcp = 0, load = 0 } = {}) {
  const band = (id, value, good, ok) => ({
    id,
    status: value <= good ? "ok" : (value <= ok ? "warn" : "fail"),
    value: Math.round(value),
  });
  return [
    band("ttfb", ttfb, 800, 1800),
    band("fcp", fcp, 1800, 3000),
    band("load", load, 2500, 5000),
  ];
}

// ---------- Accessibilité ----------

// Contrôles d'accessibilité rapides à partir des données collectées.
export function a11yChecks(a = {}) {
  const zero = (id, n) => ({
    id, status: (Number(n) || 0) === 0 ? "ok" : "warn", value: Number(n) || 0,
  });
  return [
    zero("alt", a.imagesNoAlt),
    zero("labels", a.inputsNoLabel),
    zero("linkText", a.linksNoText),
    zero("buttonText", a.buttonsNoText),
    { id: "lang", status: a.hasLang ? "ok" : "fail" },
    { id: "title", status: a.hasTitle ? "ok" : "fail" },
  ];
}

// ---------- Score global ----------

// Moyenne des scores de section (SEO, perf, a11y) → note de synthèse.
export function overallScore(scores = {}) {
  const values = Object.values(scores).filter((v) => typeof v === "number");
  if (!values.length) return { score: 0, grade: "—" };
  const score = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const grade = score >= 90 ? "A" : score >= 75 ? "B"
    : score >= 60 ? "C" : score >= 40 ? "D" : "E";
  return { score, grade };
}

// ---------- SEO / métadonnées ----------

// Évalue les métadonnées : statut ok | warn | fail par contrôle.
export function seoChecks(meta = {}) {
  const title = (meta.title || "").trim();
  const desc = (meta.description || "").trim();
  const h1 = Number(meta.h1Count) || 0;
  return [
    { id: "title",
      status: !title ? "fail"
        : (title.length < 10 || title.length > 60 ? "warn" : "ok"),
      value: title.length },
    { id: "description",
      status: !desc ? "fail"
        : (desc.length < 50 || desc.length > 160 ? "warn" : "ok"),
      value: desc.length },
    { id: "h1",
      status: h1 === 1 ? "ok" : (h1 === 0 ? "fail" : "warn"),
      value: h1 },
    { id: "viewport", status: meta.viewportMeta ? "ok" : "fail" },
    { id: "lang", status: meta.lang ? "ok" : "warn", value: meta.lang || "" },
    { id: "canonical", status: meta.canonical ? "ok" : "warn" },
    { id: "charset", status: meta.charset ? "ok" : "warn",
      value: meta.charset || "" },
  ];
}

// Note synthétique d'après les contrôles SEO (ok=2, warn=1, fail=0).
export function gradeFromChecks(checks = []) {
  if (!checks.length) return { score: 0, ok: 0, warn: 0, fail: 0, grade: "—" };
  let ok = 0;
  let warn = 0;
  let fail = 0;
  for (const check of checks) {
    if (check.status === "ok") ok++;
    else if (check.status === "warn") warn++;
    else fail++;
  }
  const score = Math.round(((ok * 2 + warn) / (checks.length * 2)) * 100);
  const grade = score >= 90 ? "A" : score >= 75 ? "B"
    : score >= 60 ? "C" : score >= 40 ? "D" : "E";
  return { score, ok, warn, fail, grade };
}

// ---------- Test responsive ----------

// Marge approximative du chrome de fenêtre (bordures + barres).
export const CHROME_WIDTH = 16;
export const CHROME_HEIGHT = 88;

export const BREAKPOINTS = [
  { id: "mobile", width: 375, height: 667 },
  { id: "mobileL", width: 414, height: 896 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "laptop", width: 1366, height: 768 },
  { id: "desktop", width: 1920, height: 1080 },
];

// Taille de fenêtre à demander pour obtenir ~le viewport voulu.
export function outerSize(width, height, rotated = false) {
  const w = rotated ? height : width;
  const h = rotated ? width : height;
  return {
    width: Math.round(w) + CHROME_WIDTH,
    height: Math.round(h) + CHROME_HEIGHT,
  };
}

// ---------- Couleurs ----------

export function topColors(counts = {}, n = 8) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([color, count]) => ({ color, count }));
}

// ---------- Rapport ----------

// Sérialise un rapport structuré en Markdown (bouton « Copier le rapport »).
export function reportToMarkdown(report = {}) {
  const lines = [`# Sunshine Dev — ${(report.title || report.url || "").trim()}`];
  if (report.url) lines.push(`<${report.url}>`);
  if (report.grade) lines.push(`Score : ${report.grade}`);
  for (const section of report.sections || []) {
    lines.push("", `## ${section.title}`);
    for (const [label, value] of section.rows || []) {
      lines.push(`- **${label}** : ${value}`);
    }
  }
  return lines.join("\n") + "\n";
}

// Sérialise un rapport structuré en JSON indenté.
export function reportToJson(report = {}) {
  const out = { title: report.title, url: report.url, grade: report.grade };
  for (const section of report.sections || []) {
    out[section.title] = Object.fromEntries(section.rows || []);
  }
  return JSON.stringify(out, null, 2);
}

// ---------- Chronologie des requêtes (waterfall) ----------

// Construit une chronologie normalisée des `n` requêtes les plus longues,
// positionnées sur une échelle commune (pourcentages) et triées par début.
export function buildWaterfall(entries, n = 12) {
  const valid = (entries || [])
    .filter((e) => (Number(e.duration) || 0) > 0)
    .map((e) => ({
      name: e.name || "", type: e.initiatorType || "other",
      start: Number(e.start) || 0, duration: Number(e.duration) || 0,
    }));
  if (!valid.length) return { rows: [], total: 0 };
  const top = [...valid]
    .sort((a, b) => b.duration - a.duration).slice(0, n)
    .sort((a, b) => a.start - b.start);
  const minStart = Math.min(...top.map((e) => e.start));
  const maxEnd = Math.max(...top.map((e) => e.start + e.duration));
  const total = Math.max(1, maxEnd - minStart);
  const rows = top.map((e) => ({
    name: e.name, type: e.type, duration: e.duration,
    offsetPct: ((e.start - minStart) / total) * 100,
    widthPct: Math.max(1, (e.duration / total) * 100),
  }));
  return { rows, total };
}

// ---------- Historique des analyses ----------

export const HISTORY_MAX = 20;

// Ajoute un enregistrement en tête et borne la taille de l'historique.
export function pushHistory(list, record, max = HISTORY_MAX) {
  return [record, ...(list || [])].slice(0, max);
}

// Dernier enregistrement (hors `exceptTs`) pour une URL donnée.
export function lastForUrl(list, url, exceptTs = null) {
  return (list || []).find((r) => r.url === url && r.ts !== exceptTs) || null;
}

// Écart de scores entre deux enregistrements, ou null.
export function scoreDelta(previous, current) {
  if (!previous || !current) return null;
  const diff = (k) => (Number(current[k]) || 0) - (Number(previous[k]) || 0);
  return {
    overall: diff("overall"), seo: diff("seo"),
    perf: diff("perf"), a11y: diff("a11y"),
  };
}

// "+5" | "-3" | "=" pour l'affichage d'un écart.
export function formatDelta(n) {
  const v = Number(n) || 0;
  if (v === 0) return "=";
  return v > 0 ? `+${v}` : String(v);
}

// ---------- Inspection au survol ----------

// Libellé compact d'un élément survolé : "div#id · 320×48".
export function elementLabel({ tag = "", id = "", className = "",
                               width = 0, height = 0 } = {}) {
  let selector = String(tag).toLowerCase() || "?";
  if (id) {
    selector += `#${id}`;
  } else if (className) {
    const first = String(className).trim().split(/\s+/)[0];
    if (first) selector += `.${first}`;
  }
  return `${selector} · ${Math.round(width)}×${Math.round(height)}`;
}
