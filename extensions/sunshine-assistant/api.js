// Sunshine Assistant — client des backends Mistral 7B.
// Module partagé entre le panneau (panel.js) et les tests node (tests/js/).

export const DEFAULT_SETTINGS = {
  backend: "ollama",                       // "ollama" (local) ou "mistral" (API)
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "mistral:7b",
  mistralKey: "",
  mistralModel: "open-mistral-7b",
};

export const SYSTEM_PROMPT =
  "Tu es Sunshine Assistant, l'assistant de navigation du navigateur " +
  "Sunshine. Tu aides l'utilisateur à comprendre et exploiter les pages " +
  "web : résumés, points clés, explications, traductions, réponses à ses " +
  "questions. Réponds dans la langue de l'utilisateur, de façon concise et " +
  "structurée. Si la question porte sur la page fournie en contexte, " +
  "appuie-toi uniquement sur son contenu et dis-le quand l'information n'y " +
  "figure pas.";

// Limite de contexte envoyée au modèle (Mistral 7B ≈ 8k tokens).
export const PAGE_CONTEXT_LIMIT = 12000;

// Construit la liste de messages au format chat (commun Ollama / Mistral).
export function buildMessages(question, history = [], page = null) {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content });
  }
  let content = question;
  if (page && page.text) {
    let text = page.text;
    if (text.length > PAGE_CONTEXT_LIMIT) {
      text = text.slice(0, PAGE_CONTEXT_LIMIT) + " […]";
    }
    content =
      `Contexte — page courante : « ${page.title} » (${page.url})\n` +
      `-----\n${text}\n-----\n\n${question}`;
  }
  messages.push({ role: "user", content });
  return messages;
}

// Parse une ligne du flux NDJSON d'Ollama (/api/chat).
// Retourne { content, done } ou null si la ligne est vide/invalide.
export function parseOllamaChunk(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let data;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return null;
  }
  return {
    content: data.message?.content ?? "",
    done: data.done === true,
  };
}

// Parse une ligne du flux SSE de l'API Mistral (/v1/chat/completions).
// Retourne { content, done } ou null si la ligne n'est pas un événement data.
export function parseMistralChunk(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (payload === "[DONE]") return { content: "", done: true };
  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    return null;
  }
  const choice = data.choices?.[0];
  return {
    content: choice?.delta?.content ?? "",
    done: choice?.finish_reason != null,
  };
}

// Prépare la requête HTTP du backend sélectionné.
export function buildRequest(settings, messages) {
  if (settings.backend === "mistral") {
    return {
      url: "https://api.mistral.ai/v1/chat/completions",
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.mistralKey}`,
        },
        body: JSON.stringify({
          model: settings.mistralModel,
          messages,
          stream: true,
        }),
      },
      parseChunk: parseMistralChunk,
    };
  }
  return {
    url: `${settings.ollamaUrl.replace(/\/$/, "")}/api/chat`,
    options: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        messages,
        stream: true,
      }),
    },
    parseChunk: parseOllamaChunk,
  };
}

// Lance la conversation et émet le texte au fil de l'eau via onDelta(texte).
// Retourne la réponse complète. fetchImpl est injectable pour les tests.
export async function streamChat(settings, messages, onDelta,
                                 fetchImpl = globalThis.fetch) {
  const { url, options, parseChunk } = buildRequest(settings, messages);
  const response = await fetchImpl(url, options);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Backend ${settings.backend} : HTTP ${response.status}` +
                    (body ? ` — ${body.slice(0, 200)}` : ""));
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      const chunk = parseChunk(line);
      if (!chunk) continue;
      if (chunk.content) {
        full += chunk.content;
        onDelta(chunk.content);
      }
      if (chunk.done) return full;
    }
  }
  return full;
}
