// Tests de l'extension Sunshine Dev (mode développeur).
// Lancement : node --test tests/js/

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXT = path.join(ROOT, "extensions", "sunshine-dev");

const lib = await import(path.join(EXT, "lib.js"));

// ---------- Manifest ----------

test("dev/manifest : MV3, permissions et fichiers présents", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Sunshine Dev");
  for (const perm of ["tabs", "scripting", "storage"]) {
    assert.ok(manifest.permissions.includes(perm), `permission ${perm}`);
  }
  assert.ok(manifest.host_permissions.some((h) => h.startsWith("https://")));
  assert.match(manifest.action.default_title, /^__MSG_\w+__$/);
  assert.equal(manifest.background.type, "module");
  for (const file of ["background.js", "dashboard.js", "devwindow.html",
                      "dashboard.css", "lib.js"]) {
    assert.ok(existsSync(path.join(EXT, file)), `${file} manquant`);
  }
});

test("dev/manifest : version alignée sur VERSION", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  const version = readFileSync(path.join(ROOT, "VERSION"), "utf8")
    .match(/^SUNSHINE_VERSION=(.+)$/m)[1];
  assert.equal(manifest.version, version);
});

// ---------- Formats ----------

test("formatBytes : seuils B/KB/MB", () => {
  assert.equal(lib.formatBytes(0), "0 B");
  assert.equal(lib.formatBytes(512), "512 B");
  assert.equal(lib.formatBytes(1024), "1.0 KB");
  assert.equal(lib.formatBytes(1536), "1.5 KB");
  assert.equal(lib.formatBytes(1048576), "1.0 MB");
  assert.equal(lib.formatBytes(15 * 1024 * 1024), "15 MB");
});

test("formatMs : ms puis secondes", () => {
  assert.equal(lib.formatMs(0), "0 ms");
  assert.equal(lib.formatMs(123.6), "124 ms");
  assert.equal(lib.formatMs(1500), "1.50 s");
  assert.equal(lib.formatMs(-5), "0 ms");
});

test("rgbToHex : conversion et cas non rgb", () => {
  assert.equal(lib.rgbToHex("rgb(232, 162, 60)"), "#e8a23c");
  assert.equal(lib.rgbToHex("rgba(0, 0, 0, 0.5)"), "#000000");
  assert.equal(lib.rgbToHex("blue"), null);
  assert.equal(lib.rgbToHex(""), null);
});

// ---------- Performance ----------

test("timingBreakdown : phases calculées, jamais négatives", () => {
  const nav = {
    startTime: 0, redirectStart: 0, redirectEnd: 0,
    domainLookupStart: 10, domainLookupEnd: 30,
    connectStart: 30, connectEnd: 80, secureConnectionStart: 50,
    requestStart: 80, responseStart: 130, responseEnd: 180,
    domInteractive: 300, domContentLoadedEventEnd: 350,
    domComplete: 500, loadEventEnd: 520,
  };
  const tb = lib.timingBreakdown(nav);
  assert.equal(tb.redirect, 0);
  assert.equal(tb.dns, 20);
  assert.equal(tb.tcp, 50);
  assert.equal(tb.tls, 30);
  assert.equal(tb.ttfb, 50);
  assert.equal(tb.download, 50);
  assert.equal(tb.domContentLoaded, 350);
  assert.equal(tb.load, 520);
});

test("timingBreakdown : HTTP sans TLS et entrée vide", () => {
  assert.equal(lib.timingBreakdown({ connectEnd: 50, secureConnectionStart: 0 }).tls, 0);
  const empty = lib.timingBreakdown({});
  assert.equal(empty.load, 0);
  assert.equal(empty.ttfb, 0);
});

test("groupResources : catégories, totaux et tri par poids", () => {
  const entries = [
    { initiatorType: "script", transferSize: 1000, decodedBodySize: 3000 },
    { initiatorType: "script", transferSize: 500, decodedBodySize: 1500 },
    { initiatorType: "img", transferSize: 4000, decodedBodySize: 4000 },
    { initiatorType: "link", transferSize: 200, decodedBodySize: 800 },
    { initiatorType: "xmlhttprequest", transferSize: 100, decodedBodySize: 100 },
    { initiatorType: "mystery", transferSize: 50, decodedBodySize: 50 },
  ];
  const rg = lib.groupResources(entries);
  assert.equal(rg.count, 6);
  assert.equal(rg.totalTransfer, 5850);
  assert.equal(rg.groups[0].type, "image");
  assert.equal(rg.groups[0].transfer, 4000);
  const script = rg.groups.find((g) => g.type === "script");
  assert.equal(script.count, 2);
  assert.equal(script.transfer, 1500);
  assert.ok(rg.groups.find((g) => g.type === "css"));
  assert.ok(rg.groups.find((g) => g.type === "fetch"));
  assert.ok(rg.groups.find((g) => g.type === "other"));
});

// ---------- SEO ----------

test("seoChecks : page bien optimisée → tout ok", () => {
  const checks = lib.seoChecks({
    title: "Un titre de page tout à fait correct",
    description: "x".repeat(100), h1Count: 1, viewportMeta: true,
    lang: "fr", canonical: "https://exemple.fr", charset: "UTF-8",
  });
  assert.ok(checks.every((c) => c.status === "ok"));
});

test("seoChecks : page vide → fails et warns attendus", () => {
  const byId = Object.fromEntries(
    lib.seoChecks({}).map((c) => [c.id, c.status]));
  assert.equal(byId.title, "fail");
  assert.equal(byId.description, "fail");
  assert.equal(byId.h1, "fail");
  assert.equal(byId.viewport, "fail");
  assert.equal(byId.lang, "warn");
  assert.equal(byId.canonical, "warn");
  assert.equal(byId.charset, "warn");
});

test("seoChecks : plusieurs H1 et longueurs limites → warn", () => {
  const checks = lib.seoChecks({ title: "court", h1Count: 3 });
  assert.equal(checks.find((c) => c.id === "title").status, "warn");
  assert.equal(checks.find((c) => c.id === "h1").status, "warn");
});

test("gradeFromChecks : note A pour tout ok, E pour tout fail", () => {
  const allOk = [{ status: "ok" }, { status: "ok" }, { status: "ok" }];
  assert.deepEqual(
    { grade: lib.gradeFromChecks(allOk).grade, score: lib.gradeFromChecks(allOk).score },
    { grade: "A", score: 100 });
  const allFail = [{ status: "fail" }, { status: "fail" }];
  assert.equal(lib.gradeFromChecks(allFail).grade, "E");
  assert.equal(lib.gradeFromChecks([]).grade, "—");
});

// ---------- Responsive ----------

test("BREAKPOINTS : entrées valides", () => {
  assert.ok(lib.BREAKPOINTS.length >= 5);
  for (const bp of lib.BREAKPOINTS) {
    assert.ok(bp.id && bp.width > 0 && bp.height > 0);
  }
});

test("outerSize : marge de chrome et rotation", () => {
  assert.deepEqual(lib.outerSize(375, 667),
                   { width: 375 + lib.CHROME_WIDTH, height: 667 + lib.CHROME_HEIGHT });
  assert.deepEqual(lib.outerSize(375, 667, true),
                   { width: 667 + lib.CHROME_WIDTH, height: 375 + lib.CHROME_HEIGHT });
});

// ---------- Couleurs et rapport ----------

test("topColors : tri décroissant et limite", () => {
  const top = lib.topColors({ "#fff": 5, "#000": 10, "#e8a23c": 7 }, 2);
  assert.deepEqual(top, [{ color: "#000", count: 10 },
                         { color: "#e8a23c", count: 7 }]);
});

test("reportToMarkdown : titre, url et sections", () => {
  const md = lib.reportToMarkdown({
    title: "Ma page", url: "https://exemple.fr", grade: "A (100/100)",
    sections: [{ title: "Performance", rows: [["TTFB", "50 ms"]] }],
  });
  assert.ok(md.includes("# Sunshine Dev — Ma page"));
  assert.ok(md.includes("<https://exemple.fr>"));
  assert.ok(md.includes("## Performance"));
  assert.ok(md.includes("- **TTFB** : 50 ms"));
});

test("reportToJson : objet sérialisé par section", () => {
  const json = JSON.parse(lib.reportToJson({
    title: "Ma page", url: "https://exemple.fr", grade: "A",
    sections: [{ title: "Perf", rows: [["TTFB", "50 ms"], ["Load", "1 s"]] }],
  }));
  assert.equal(json.title, "Ma page");
  assert.equal(json.grade, "A");
  assert.deepEqual(json.Perf, { TTFB: "50 ms", Load: "1 s" });
});

// ---------- Améliorations : URLs, contraste, budget, a11y, score global ----------

test("shortenUrl : nom de fichier, hôte, troncature", () => {
  assert.equal(lib.shortenUrl("https://x.com/assets/app.1234.js"), "app.1234.js");
  assert.equal(lib.shortenUrl("https://exemple.fr/"), "exemple.fr");
  const long = lib.shortenUrl("https://x.com/" + "a".repeat(60) + ".css");
  assert.ok(long.startsWith("…"));
  assert.ok(long.length <= 43);
});

test("parseColor : hex court/long et rgb", () => {
  assert.deepEqual(lib.parseColor("#e8a23c"), [232, 162, 60]);
  assert.deepEqual(lib.parseColor("#fff"), [255, 255, 255]);
  assert.deepEqual(lib.parseColor("rgb(0, 128, 255)"), [0, 128, 255]);
  assert.equal(lib.parseColor("pas une couleur"), null);
});

test("contrastRatio : extrêmes et cas connu", () => {
  assert.equal(lib.contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(lib.contrastRatio("#ffffff", "#ffffff"), 1);
  assert.equal(lib.contrastRatio("#777777", "#ffffff"), 4.48);
  assert.equal(lib.contrastRatio("#000", "zzz"), null);
});

test("wcagLevel : seuils texte normal et large", () => {
  assert.equal(lib.wcagLevel(21), "AAA");
  assert.equal(lib.wcagLevel(5), "AA");
  assert.equal(lib.wcagLevel(3), "—");
  assert.equal(lib.wcagLevel(3, true), "AA");
  assert.equal(lib.wcagLevel(4.5, true), "AAA");
  assert.equal(lib.wcagLevel(null), "—");
});

test("perfChecks : ok / warn / fail selon les seuils", () => {
  const good = Object.fromEntries(
    lib.perfChecks({ ttfb: 200, fcp: 1000, load: 2000 }).map((c) => [c.id, c.status]));
  assert.deepEqual(good, { ttfb: "ok", fcp: "ok", load: "ok" });
  const warn = Object.fromEntries(
    lib.perfChecks({ ttfb: 1000, fcp: 2500, load: 4000 }).map((c) => [c.id, c.status]));
  assert.deepEqual(warn, { ttfb: "warn", fcp: "warn", load: "warn" });
  const bad = Object.fromEntries(
    lib.perfChecks({ ttfb: 3000, fcp: 5000, load: 9000 }).map((c) => [c.id, c.status]));
  assert.deepEqual(bad, { ttfb: "fail", fcp: "fail", load: "fail" });
});

test("heaviestResources : tri décroissant, limite, zéro exclu", () => {
  const top = lib.heaviestResources([
    { name: "a.js", transferSize: 1000 },
    { name: "b.css", transferSize: 4000 },
    { name: "c.png", transferSize: 0 },
    { name: "d.woff", transferSize: 2000 },
  ], 2);
  assert.deepEqual(top, [{ name: "b.css", transfer: 4000 },
                         { name: "d.woff", transfer: 2000 }]);
});

test("a11yChecks : page propre vs problèmes", () => {
  const clean = Object.fromEntries(lib.a11yChecks({
    imagesNoAlt: 0, inputsNoLabel: 0, linksNoText: 0, buttonsNoText: 0,
    hasLang: true, hasTitle: true,
  }).map((c) => [c.id, c.status]));
  assert.ok(Object.values(clean).every((s) => s === "ok"));
  const issues = Object.fromEntries(lib.a11yChecks({
    imagesNoAlt: 3, inputsNoLabel: 1, hasLang: false, hasTitle: false,
  }).map((c) => [c.id, c.status]));
  assert.equal(issues.alt, "warn");
  assert.equal(issues.labels, "warn");
  assert.equal(issues.lang, "fail");
  assert.equal(issues.title, "fail");
});

test("overallScore : moyenne et note", () => {
  assert.deepEqual(lib.overallScore({ seo: 100, perf: 50, a11y: 75 }),
                   { score: 75, grade: "B" });
  assert.equal(lib.overallScore({}).grade, "—");
});
