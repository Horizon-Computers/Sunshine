// Tests de l'extension Sunshine Reader (mode lecture zen).
// Lancement : node --test tests/js/

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXT = path.join(ROOT, "extensions", "sunshine-reader");

const lib = await import(path.join(EXT, "lib.js"));

// ---------- Manifest ----------

test("reader/manifest : permissions, lib accessible, fichiers présents", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.permissions.includes("activeTab"));
  assert.ok(manifest.permissions.includes("scripting"));
  assert.ok(manifest.web_accessible_resources[0].resources.includes("lib.js"));
  for (const file of ["background.js", "reader.js", "lib.js"]) {
    assert.ok(existsSync(path.join(EXT, file)), `${file} manquant`);
  }
});

test("reader/manifest : version alignée sur VERSION", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  const version = readFileSync(path.join(ROOT, "VERSION"), "utf8")
    .match(/^SUNSHINE_VERSION=(.+)$/m)[1];
  assert.equal(manifest.version, version);
});

// ---------- Temps de lecture ----------

test("wordCount : espaces multiples, texte vide", () => {
  assert.equal(lib.wordCount("un  deux\n trois"), 3);
  assert.equal(lib.wordCount("   "), 0);
  assert.equal(lib.wordCount(""), 0);
});

test("readingTime : arrondi, minimum 1 minute, zéro si vide", () => {
  assert.equal(lib.readingTime(0), 0);
  assert.equal(lib.readingTime(50), 1);
  assert.equal(lib.readingTime(200), 1);
  assert.equal(lib.readingTime(700), 4);   // 700/200 = 3,5 → 4
  assert.equal(lib.readingTime(1000, 100), 10);
});

// ---------- Sélection du contenu ----------

test("linkDensity : bornes et cas dégénéré", () => {
  assert.equal(lib.linkDensity({ textLength: 1000, linkTextLength: 0 }), 0);
  assert.equal(lib.linkDensity({ textLength: 1000, linkTextLength: 500 }), 0.5);
  assert.equal(lib.linkDensity({ textLength: 0, linkTextLength: 0 }), 1);
});

test("scoreCandidate : un article bat un bloc de navigation", () => {
  const article = lib.scoreCandidate(
    { textLength: 4000, linkTextLength: 200, paragraphs: 18 });
  const navigation = lib.scoreCandidate(
    { textLength: 1200, linkTextLength: 1100, paragraphs: 4 });
  const empty = lib.scoreCandidate({});
  assert.ok(article > navigation);
  assert.ok(navigation > empty);
});

// ---------- Titre ----------

test("cleanTitle : suffixes de site retirés, titre nu conservé", () => {
  assert.equal(lib.cleanTitle("Mon article - Le Monde", "lemonde.fr"),
               "Mon article");
  assert.equal(lib.cleanTitle("Mon article | Wikipédia", "fr.wikipedia.org"),
               "Mon article");
  assert.equal(lib.cleanTitle("Un titre sans séparateur", "exemple.fr"),
               "Un titre sans séparateur");
  // Le séparateur fait partie du titre réel : suffixe long non lié au site.
  assert.equal(
    lib.cleanTitle("Guerre - une histoire des hommes et des conflits armés",
                   "exemple.fr"),
    "Guerre - une histoire des hommes et des conflits armés");
});

// ---------- Filtrage ----------

test("KEEP_TAGS / KEEP_ATTRIBUTES : essentiels présents, dangereux absents", () => {
  for (const tag of ["P", "H1", "IMG", "BLOCKQUOTE", "PRE", "A"]) {
    assert.ok(lib.KEEP_TAGS.has(tag), `${tag} devrait être conservé`);
  }
  for (const tag of ["SCRIPT", "IFRAME", "FORM", "NAV", "BUTTON"]) {
    assert.ok(!lib.KEEP_TAGS.has(tag), `${tag} ne doit pas être conservé`);
  }
  assert.ok(lib.KEEP_ATTRIBUTES.has("href"));
  for (const attr of ["onclick", "style", "class"]) {
    assert.ok(!lib.KEEP_ATTRIBUTES.has(attr), `${attr} doit être retiré`);
  }
});
