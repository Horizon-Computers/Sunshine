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
