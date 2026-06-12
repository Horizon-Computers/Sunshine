// Sunshine Assistant — logique du panneau latéral.
import { DEFAULT_SETTINGS, buildMessages, streamChat } from "./api.js";

const $ = (sel) => document.querySelector(sel);
const messagesEl = $("#messages");
const inputEl = $("#input");
const sendEl = $("#send");

let settings = { ...DEFAULT_SETTINGS };
let history = [];   // [{role, content}] — mémoire de la conversation
let busy = false;

// ---------- Réglages ----------

async function loadSettings() {
  const stored = await chrome.storage.local.get("settings");
  settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
  document.querySelector(
    `input[name="backend"][value="${settings.backend}"]`).checked = true;
  $("#ollama-url").value = settings.ollamaUrl;
  $("#ollama-model").value = settings.ollamaModel;
  $("#mistral-key").value = settings.mistralKey;
  $("#mistral-model").value = settings.mistralModel;
}

function readSettingsForm() {
  return {
    backend: document.querySelector('input[name="backend"]:checked').value,
    ollamaUrl: $("#ollama-url").value.trim() || DEFAULT_SETTINGS.ollamaUrl,
    ollamaModel: $("#ollama-model").value.trim() || DEFAULT_SETTINGS.ollamaModel,
    mistralKey: $("#mistral-key").value.trim(),
    mistralModel: $("#mistral-model").value.trim() || DEFAULT_SETTINGS.mistralModel,
  };
}

async function saveSettings() {
  settings = readSettingsForm();
  await chrome.storage.local.set({ settings });
  setStatus("Réglages enregistrés ✓", false);
}

async function testConnection() {
  setStatus("Test en cours…", false);
  try {
    const probe = readSettingsForm();
    await streamChat(probe, buildMessages("Réponds uniquement : ok"), () => {});
    setStatus("Connexion réussie ✓", false);
  } catch (err) {
    setStatus(`Échec : ${err.message}`, true);
  }
}

function setStatus(text, isError) {
  const el = $("#settings-status");
  el.textContent = text;
  el.style.color = isError ? "#8a2424" : "#3e7a2e";
}

// ---------- Contexte de la page courante ----------

// Exécutée DANS la page : extrait le texte principal.
function extractPage() {
  const clone = document.body.cloneNode(true);
  for (const sel of ["script", "style", "noscript", "nav", "footer",
                     "header", "aside", "iframe", "svg"]) {
    clone.querySelectorAll(sel).forEach((n) => n.remove());
  }
  return {
    title: document.title,
    url: location.href,
    text: (clone.innerText || "").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

async function getPageContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.url?.startsWith("chrome://") || tab.url?.startsWith("brave://")) {
    return null;
  }
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPage,
    });
    return result;
  } catch {
    return null; // page protégée (boutique, PDF…) : on continue sans contexte
  }
}

// ---------- Conversation ----------

function addMessage(role, text = "") {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

async function ask(question) {
  if (busy || !question.trim()) return;
  busy = true;
  sendEl.disabled = true;
  inputEl.value = "";

  addMessage("user", question);
  const usePage = $("#use-page").checked;
  const page = usePage ? await getPageContext() : null;
  if (usePage && !page) {
    addMessage("error",
      "Impossible de lire la page courante (page interne ou protégée) — " +
      "réponse sans contexte de page.");
  }

  const bubble = addMessage("assistant");
  bubble.classList.add("pending");
  try {
    const messages = buildMessages(question, history, page);
    const answer = await streamChat(settings, messages, (delta) => {
      bubble.textContent += delta;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
    history.push({ role: "user", content: question },
                 { role: "assistant", content: answer });
    if (history.length > 12) history = history.slice(-12);
  } catch (err) {
    bubble.remove();
    const help = settings.backend === "ollama"
      ? " Vérifie qu'Ollama tourne (`ollama serve`) et que le modèle est " +
        "installé (`ollama pull mistral:7b`), ou configure l'API Mistral " +
        "dans ⚙."
      : " Vérifie ta clé d'API Mistral dans ⚙.";
    addMessage("error", `${err.message}.${help}`);
  } finally {
    bubble.classList.remove("pending");
    busy = false;
    sendEl.disabled = false;
    inputEl.focus();
  }
}

// ---------- Branchements ----------

function init() {
  loadSettings();

  $("#settings-toggle").addEventListener("click", () => {
    $("#settings").hidden = !$("#settings").hidden;
  });
  $("#settings-save").addEventListener("click", saveSettings);
  $("#settings-test").addEventListener("click", testConnection);

  for (const btn of document.querySelectorAll("#quick-actions button")) {
    btn.addEventListener("click", () => {
      $("#use-page").checked = true;
      ask(btn.dataset.prompt);
    });
  }

  sendEl.addEventListener("click", () => ask(inputEl.value));
  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask(inputEl.value);
    }
  });

  addMessage("assistant",
    "Bonjour ! Je suis Sunshine Assistant (Mistral 7B). Pose-moi une " +
    "question sur la page courante ou utilise les boutons ci-dessus. " +
    "Configure le backend dans ⚙ (Ollama local par défaut).");
}

init();
