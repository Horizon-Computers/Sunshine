// Tests de l'extension Sunshine Focus (anti-défilement).
// Lancement : node --test tests/js/

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXT = path.join(ROOT, "extensions", "sunshine-focus");

const lib = await import(path.join(EXT, "lib.js"));

// ---------- Manifest ----------

test("focus/manifest : MV3, content script et lib accessible", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Sunshine Focus");
  assert.ok(manifest.permissions.includes("storage"));
  const cs = manifest.content_scripts[0];
  assert.ok(cs.js.includes("content.js"));
  assert.ok(cs.matches.some((m) => m.startsWith("https://")));
  assert.ok(manifest.web_accessible_resources[0].resources.includes("lib.js"));
  for (const file of ["content.js", "lib.js", "popup.html", "popup.js",
                      manifest.action.default_popup]) {
    assert.ok(existsSync(path.join(EXT, file)), `${file} manquant`);
  }
});

test("focus/manifest : version alignée sur VERSION", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  const version = readFileSync(path.join(ROOT, "VERSION"), "utf8")
    .match(/^SUNSHINE_VERSION=(.+)$/m)[1];
  assert.equal(manifest.version, version);
});

// ---------- matchesSite ----------

test("matchesSite : domaine exact, sous-domaine, non-membre", () => {
  const sites = lib.DEFAULT_FOCUS_SETTINGS.sites;
  assert.ok(lib.matchesSite("youtube.com", sites));
  assert.ok(lib.matchesSite("m.youtube.com", sites));
  assert.ok(lib.matchesSite("www.reddit.com", sites));
  assert.ok(!lib.matchesSite("notyoutube.com", sites));
  assert.ok(!lib.matchesSite("example.org", sites));
  assert.ok(!lib.matchesSite("", sites));
});

// ---------- Défilement ----------

test("screensScrolled : arrondi à l'écran inférieur et bords", () => {
  assert.equal(lib.screensScrolled(0, 800), 0);
  assert.equal(lib.screensScrolled(799, 800), 0);
  assert.equal(lib.screensScrolled(800, 800), 1);
  assert.equal(lib.screensScrolled(8000, 800), 10);
  assert.equal(lib.screensScrolled(1000, 0), 0);
});

test("shouldWarn : à chaque tranche de budget, jamais si budget 0", () => {
  assert.ok(!lib.shouldWarn(9, 10, 0));
  assert.ok(lib.shouldWarn(10, 10, 0));
  assert.ok(lib.shouldWarn(14, 10, 0));
  // Après une pause à 14 écrans, la suivante attend 24.
  assert.ok(!lib.shouldWarn(20, 10, 14));
  assert.ok(lib.shouldWarn(24, 10, 14));
  assert.ok(!lib.shouldWarn(100, 0, 0));
});

// ---------- Masquage ----------

test("cssForHost : règles YouTube présentes, site inconnu vide", () => {
  const css = lib.cssForHost("www.youtube.com");
  assert.ok(css.includes("display: none !important"));
  assert.ok(css.includes("ytd-reel-shelf-renderer"));
  assert.equal(lib.cssForHost("example.org"), "");
});

test("cssForHost : x.com et twitter.com partagent les règles tendances", () => {
  for (const host of ["x.com", "twitter.com"]) {
    assert.ok(lib.cssForHost(host).includes("sidebarColumn"));
  }
});

// ---------- Messages ----------

test("messages : pluriel des minutes et nombre d'écrans", () => {
  assert.ok(lib.reminderMessage(1).includes("1 minute "));
  assert.ok(lib.reminderMessage(10).includes("10 minutes"));
  assert.ok(lib.scrollMessage(12).includes("12 écrans"));
});

// ---------- Statistiques locales ----------

test("dayKey : format AAAA-MM-JJ en date locale", () => {
  assert.equal(lib.dayKey(new Date(2026, 5, 12)), "2026-06-12");
  assert.equal(lib.dayKey(new Date(2026, 0, 3)), "2026-01-03");
  assert.match(lib.dayKey(), /^\d{4}-\d{2}-\d{2}$/);
});

test("recordActivity : cumul par jour et par site", () => {
  let stats = lib.recordActivity({}, "2026-06-12", "youtube.com",
                                 { seconds: 30, screens: 2 });
  stats = lib.recordActivity(stats, "2026-06-12", "youtube.com",
                             { seconds: 30, screens: 1 });
  stats = lib.recordActivity(stats, "2026-06-12", "reddit.com",
                             { seconds: 120 });
  assert.deepEqual(stats["2026-06-12"]["youtube.com"],
                   { seconds: 60, screens: 3 });
  assert.deepEqual(stats["2026-06-12"]["reddit.com"],
                   { seconds: 120, screens: 0 });
});

test("pruneStats : ne garde que les jours les plus récents", () => {
  const stats = {};
  for (let d = 1; d <= 10; d++) {
    lib.recordActivity(stats, `2026-06-${String(d).padStart(2, "0")}`,
                       "x.com", { seconds: 1 });
  }
  lib.pruneStats(stats, 7);
  const days = Object.keys(stats).sort();
  assert.equal(days.length, 7);
  assert.equal(days[0], "2026-06-04");
  assert.equal(days.at(-1), "2026-06-10");
});

test("statsSummary : totaux et tri par temps décroissant", () => {
  let stats = lib.recordActivity({}, "2026-06-12", "reddit.com",
                                 { seconds: 300, screens: 12 });
  stats = lib.recordActivity(stats, "2026-06-12", "youtube.com",
                             { seconds: 900, screens: 30 });
  const today = lib.statsSummary(stats, "2026-06-12");
  assert.equal(today.totalSeconds, 1200);
  assert.equal(today.totalScreens, 42);
  assert.equal(today.sites[0][0], "youtube.com");
  // Jour sans données : bilan vide.
  const empty = lib.statsSummary(stats, "2026-06-11");
  assert.equal(empty.totalSeconds, 0);
  assert.deepEqual(empty.sites, []);
});

test("weekSummary : 7 jours chronologiques, vides à zéro, mois traversé", () => {
  let stats = lib.recordActivity({}, "2026-06-12", "x.com",
                                 { seconds: 600, screens: 5 });
  stats = lib.recordActivity(stats, "2026-06-10", "x.com", { seconds: 60 });
  const week = lib.weekSummary(stats, "2026-06-12");
  assert.equal(week.length, 7);
  assert.equal(week[0].day, "2026-06-06");
  assert.equal(week.at(-1).day, "2026-06-12");
  assert.equal(week.at(-1).seconds, 600);
  assert.equal(week[4].seconds, 60);     // 2026-06-10
  assert.equal(week[1].seconds, 0);      // jour sans données
  // Passage de mois : la fenêtre remonte sur mai.
  const cross = lib.weekSummary({}, "2026-06-03");
  assert.equal(cross[0].day, "2026-05-28");
});

test("formatMinutes : seuils lisibles", () => {
  assert.equal(lib.formatMinutes(0), "< 1 min");
  assert.equal(lib.formatMinutes(59), "< 1 min");
  assert.equal(lib.formatMinutes(60), "1 min");
  assert.equal(lib.formatMinutes(45 * 60), "45 min");
  assert.equal(lib.formatMinutes(125 * 60), "2 h 05");
});

// ---------- Cohérence des réglages par défaut ----------

test("réglages par défaut raisonnables", () => {
  const cfg = lib.DEFAULT_FOCUS_SETTINGS;
  assert.ok(cfg.enabled);
  assert.ok(cfg.screensBudget > 0 && cfg.screensBudget <= 30);
  assert.ok(cfg.reminderMinutes > 0 && cfg.reminderMinutes <= 60);
  assert.ok(cfg.sites.length >= 5);
  // Chaque site avec règles de masquage est aussi surveillé par défaut.
  for (const site of Object.keys(lib.HIDE_RULES)) {
    assert.ok(lib.matchesSite(site, cfg.sites), `${site} non surveillé`);
  }
});
