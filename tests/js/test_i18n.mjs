// Tests d'internationalisation des extensions intégrées.
// Vérifie que les locales fr/en sont valides, complètes et couvrent toutes
// les clés référencées par le code et le HTML.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXTENSIONS = readdirSync(path.join(ROOT, "extensions"));

function messages(ext, locale) {
  return JSON.parse(readFileSync(
    path.join(ROOT, "extensions", ext, "_locales", locale, "messages.json")));
}

function sources(ext) {
  const dir = path.join(ROOT, "extensions", ext);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js") || f.endsWith(".html"))
    .map((f) => readFileSync(path.join(dir, f), "utf8"))
    .join("\n");
}

for (const ext of EXTENSIONS) {
  test(`${ext} : locales fr et en présentes et symétriques`, () => {
    const fr = messages(ext, "fr");
    const en = messages(ext, "en");
    assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort(),
                     "clés fr/en différentes");
    for (const locale of [fr, en]) {
      for (const [key, value] of Object.entries(locale)) {
        assert.ok(value.message?.trim(), `message vide : ${key}`);
      }
    }
  });

  test(`${ext} : manifest localisé (default_locale + __MSG__)`, () => {
    const manifest = JSON.parse(readFileSync(
      path.join(ROOT, "extensions", ext, "manifest.json")));
    assert.equal(manifest.default_locale, "fr");
    const match = manifest.description.match(/^__MSG_(\w+)__$/);
    assert.ok(match, "description non localisée");
    assert.ok(messages(ext, "fr")[match[1]], `clé ${match[1]} absente (fr)`);
  });

  test(`${ext} : toutes les clés utilisées existent dans les deux locales`, () => {
    const fr = messages(ext, "fr");
    const en = messages(ext, "en");
    const src = sources(ext);
    const used = new Set();
    for (const m of src.matchAll(/data-i18n(?:-title|-placeholder)?="(\w+)"/g)) {
      used.add(m[1]);
    }
    for (const m of src.matchAll(/data-prompt-key="(\w+)"/g)) used.add(m[1]);
    for (const m of src.matchAll(/getMessage\("(\w+)"/g)) used.add(m[1]);
    for (const m of src.matchAll(/\bt\("(\w+)"/g)) used.add(m[1]);
    assert.ok(used.size >= 5, `trop peu de clés détectées (${used.size})`);
    for (const key of used) {
      assert.ok(fr[key], `clé manquante en fr : ${key}`);
      assert.ok(en[key], `clé manquante en en : ${key}`);
    }
  });

  test(`${ext} : placeholders identiques entre fr et en`, () => {
    const fr = messages(ext, "fr");
    const en = messages(ext, "en");
    for (const key of Object.keys(fr)) {
      const phFr = Object.keys(fr[key].placeholders || {}).sort();
      const phEn = Object.keys(en[key].placeholders || {}).sort();
      assert.deepEqual(phFr, phEn, `placeholders différents : ${key}`);
      for (const ph of phFr) {
        assert.ok(fr[key].message.includes(`$${ph}$`),
                  `$${ph}$ absent du message fr : ${key}`);
        assert.ok(en[key].message.includes(`$${ph}$`),
                  `$${ph}$ absent du message en : ${key}`);
      }
    }
  });
}
