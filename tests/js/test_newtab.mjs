// Tests de l'extension Sunshine New Tab.
// Lancement : node --test tests/js/

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXT = path.join(ROOT, "extensions", "sunshine-newtab");

const lib = await import(path.join(EXT, "lib.js"));

// ---------- Manifest ----------

test("newtab/manifest : surcharge du nouvel onglet, fichiers présents", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.chrome_url_overrides.newtab, "newtab.html");
  assert.ok(manifest.permissions.includes("storage"));
  for (const file of ["newtab.html", "newtab.css", "newtab.js", "lib.js"]) {
    assert.ok(existsSync(path.join(EXT, file)), `${file} manquant`);
  }
});

test("newtab/manifest : version alignée sur VERSION", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  const version = readFileSync(path.join(ROOT, "VERSION"), "utf8")
    .match(/^SUNSHINE_VERSION=(.+)$/m)[1];
  assert.equal(manifest.version, version);
});

// ---------- Salutation et ciel ----------

test("greetingKey : bornes des périodes", () => {
  assert.equal(lib.greetingKey(0), "greetingNight");
  assert.equal(lib.greetingKey(5), "greetingNight");
  assert.equal(lib.greetingKey(6), "greetingMorning");
  assert.equal(lib.greetingKey(11), "greetingMorning");
  assert.equal(lib.greetingKey(12), "greetingAfternoon");
  assert.equal(lib.greetingKey(17), "greetingAfternoon");
  assert.equal(lib.greetingKey(18), "greetingEvening");
  assert.equal(lib.greetingKey(21), "greetingEvening");
  assert.equal(lib.greetingKey(22), "greetingNight");
});

test("skyTheme : aube, jour, crépuscule, nuit", () => {
  assert.equal(lib.skyTheme(3), "night");
  assert.equal(lib.skyTheme(6), "dawn");
  assert.equal(lib.skyTheme(8), "dawn");
  assert.equal(lib.skyTheme(9), "day");
  assert.equal(lib.skyTheme(17), "day");
  assert.equal(lib.skyTheme(18), "dusk");
  assert.equal(lib.skyTheme(20), "dusk");
  assert.equal(lib.skyTheme(21), "night");
});

test("skyTheme : tous les thèmes existent dans le CSS", () => {
  const css = readFileSync(path.join(EXT, "newtab.css"), "utf8");
  for (const theme of ["dawn", "day", "dusk", "night"]) {
    assert.ok(css.includes(`body[data-sky="${theme}"]`),
              `gradient manquant : ${theme}`);
  }
});

// ---------- Recherche ----------

test("searchUrl : encodage et repli sur Brave Search", () => {
  assert.equal(lib.searchUrl("brave", "café crème"),
               "https://search.brave.com/search?q=caf%C3%A9%20cr%C3%A8me");
  assert.ok(lib.searchUrl("duckduckgo", "test")
              .startsWith("https://duckduckgo.com/"));
  assert.ok(lib.searchUrl("inconnu", "x")
              .startsWith("https://search.brave.com/"));
});

test("ENGINES : tous les moteurs en HTTPS", () => {
  for (const [name, base] of Object.entries(lib.ENGINES)) {
    assert.ok(base.startsWith("https://"), `${name} non HTTPS`);
  }
});

// ---------- Raccourcis ----------

test("hostnameOf / letterOf : domaines et initiales", () => {
  assert.equal(lib.hostnameOf("https://www.exemple.fr/page"), "exemple.fr");
  assert.equal(lib.hostnameOf("pas une url"), "");
  assert.equal(lib.letterOf({ name: "Sunshine", url: "https://x.org" }), "S");
  assert.equal(lib.letterOf({ name: "", url: "https://wikipedia.org" }), "W");
  assert.equal(lib.letterOf({ name: "", url: "invalide" }), "?");
});

test("parseShortcuts : lignes valides, noms déduits, lignes invalides ignorées", () => {
  const parsed = lib.parseShortcuts(
    "Sunshine | https://github.com/Horizon-Computers/Sunshine\n" +
    "\n" +
    "| https://exemple.fr\n" +
    "Sans URL\n" +
    "Cassé | pas-une-url\n");
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0],
    { name: "Sunshine", url: "https://github.com/Horizon-Computers/Sunshine" });
  assert.deepEqual(parsed[1], { name: "exemple.fr", url: "https://exemple.fr" });
});

test("réglages par défaut : moteur connu et raccourcis valides", () => {
  const cfg = lib.DEFAULT_NEWTAB_SETTINGS;
  assert.ok(lib.ENGINES[cfg.engine]);
  for (const shortcut of cfg.shortcuts) {
    assert.ok(lib.hostnameOf(shortcut.url), `URL invalide : ${shortcut.url}`);
    assert.ok(shortcut.name);
  }
});
