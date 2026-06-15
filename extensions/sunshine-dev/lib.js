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
