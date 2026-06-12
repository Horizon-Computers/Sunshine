// Tests de l'extension Sunshine Assistant.
// Lancement : node --test tests/js/

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXT = path.join(ROOT, "extensions", "sunshine-assistant");

const api = await import(path.join(EXT, "api.js"));

// ---------- Manifest ----------

test("manifest : structure MV3 valide", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Sunshine Assistant");
  assert.ok(manifest.permissions.includes("sidePanel"));
  assert.ok(manifest.permissions.includes("scripting"));
  assert.ok(manifest.permissions.includes("contextMenus"));
  assert.ok(manifest.host_permissions.some((h) => h.includes("api.mistral.ai")));
  assert.ok(manifest.host_permissions.some((h) => h.includes("localhost:11434")));
});

test("manifest : les fichiers référencés existent", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  for (const file of [manifest.side_panel.default_path,
                      manifest.background.service_worker]) {
    assert.ok(existsSync(path.join(EXT, file)), `${file} manquant`);
  }
});

test("manifest : version alignée sur VERSION", () => {
  const manifest = JSON.parse(readFileSync(path.join(EXT, "manifest.json")));
  const version = readFileSync(path.join(ROOT, "VERSION"), "utf8")
    .match(/^SUNSHINE_VERSION=(.+)$/m)[1];
  assert.equal(manifest.version, version);
});

// ---------- buildMessages ----------

test("buildMessages : système + question simple", () => {
  const messages = api.buildMessages("Bonjour");
  assert.equal(messages[0].role, "system");
  assert.equal(messages.at(-1).role, "user");
  assert.equal(messages.at(-1).content, "Bonjour");
});

test("buildMessages : contexte de page injecté et tronqué", () => {
  const page = { title: "Titre", url: "https://exemple.fr",
                 text: "x".repeat(api.PAGE_CONTEXT_LIMIT + 500) };
  const messages = api.buildMessages("Résume", [], page);
  const content = messages.at(-1).content;
  assert.ok(content.includes("Titre"));
  assert.ok(content.includes("https://exemple.fr"));
  assert.ok(content.includes("Résume"));
  assert.ok(content.includes("[…]"));
  assert.ok(content.length < api.PAGE_CONTEXT_LIMIT + 400);
});

test("buildMessages : historique conservé dans l'ordre", () => {
  const history = [{ role: "user", content: "q1" },
                   { role: "assistant", content: "r1" }];
  const messages = api.buildMessages("q2", history);
  assert.deepEqual(messages.map((m) => m.role),
                   ["system", "user", "assistant", "user"]);
});

test("buildSelectionQuestion : sélection incluse et tronquée", () => {
  const q = api.buildSelectionQuestion("  un passage important  ");
  assert.ok(q.includes("« un passage important »"));
  assert.ok(q.toLowerCase().includes("explique"));
  const long = api.buildSelectionQuestion("y".repeat(api.SELECTION_LIMIT + 100));
  assert.ok(long.includes("[…]"));
  assert.ok(long.length < api.SELECTION_LIMIT + 200);
});

// ---------- Parsing des flux ----------

test("parseOllamaChunk : delta et fin de flux", () => {
  assert.deepEqual(
    api.parseOllamaChunk('{"message":{"content":"Bon"},"done":false}'),
    { content: "Bon", done: false });
  assert.deepEqual(
    api.parseOllamaChunk('{"message":{"content":""},"done":true}'),
    { content: "", done: true });
  assert.equal(api.parseOllamaChunk(""), null);
  assert.equal(api.parseOllamaChunk("pas du json"), null);
});

test("parseMistralChunk : SSE delta, [DONE] et bruit", () => {
  assert.deepEqual(
    api.parseMistralChunk(
      'data: {"choices":[{"delta":{"content":"jour"},"finish_reason":null}]}'),
    { content: "jour", done: false });
  assert.deepEqual(api.parseMistralChunk("data: [DONE]"),
                   { content: "", done: true });
  assert.equal(api.parseMistralChunk(": keep-alive"), null);
  assert.equal(api.parseMistralChunk(""), null);
  const fin = api.parseMistralChunk(
    'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}');
  assert.deepEqual(fin, { content: "", done: true });
});

// ---------- buildRequest ----------

test("buildRequest : backend ollama", () => {
  const settings = { ...api.DEFAULT_SETTINGS, ollamaUrl: "http://localhost:11434/" };
  const req = api.buildRequest(settings, [{ role: "user", content: "x" }]);
  assert.equal(req.url, "http://localhost:11434/api/chat");
  const body = JSON.parse(req.options.body);
  assert.equal(body.model, "mistral:7b");
  assert.equal(body.stream, true);
});

test("buildRequest : backend API Mistral avec clé", () => {
  const settings = { ...api.DEFAULT_SETTINGS, backend: "mistral",
                     mistralKey: "sk-test" };
  const req = api.buildRequest(settings, []);
  assert.equal(req.url, "https://api.mistral.ai/v1/chat/completions");
  assert.equal(req.options.headers.Authorization, "Bearer sk-test");
  assert.equal(JSON.parse(req.options.body).model, "open-mistral-7b");
});

// ---------- streamChat (fetch simulé) ----------

function fakeStreamResponse(lines) {
  const encoder = new TextEncoder();
  let sent = false;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true };
          sent = true;
          return { value: encoder.encode(lines.join("\n") + "\n"), done: false };
        },
      }),
    },
  };
}

test("streamChat : agrège les deltas Ollama et notifie onDelta", async () => {
  const fakeFetch = async () => fakeStreamResponse([
    '{"message":{"content":"Bon"},"done":false}',
    '{"message":{"content":"jour"},"done":false}',
    '{"message":{"content":""},"done":true}',
  ]);
  const deltas = [];
  const full = await api.streamChat(api.DEFAULT_SETTINGS,
    api.buildMessages("salut"), (d) => deltas.push(d), fakeFetch);
  assert.equal(full, "Bonjour");
  assert.deepEqual(deltas, ["Bon", "jour"]);
});

test("streamChat : erreur HTTP remontée avec le statut", async () => {
  const fakeFetch = async () => ({ ok: false, status: 401,
                                   text: async () => "Unauthorized" });
  await assert.rejects(
    api.streamChat({ ...api.DEFAULT_SETTINGS, backend: "mistral" },
                   [], () => {}, fakeFetch),
    /HTTP 401/);
});
