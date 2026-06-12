// Sunshine New Tab — page « nouvel onglet ».
import { DEFAULT_NEWTAB_SETTINGS, greetingKey, skyTheme, searchUrl,
         letterOf, parseShortcuts } from "./lib.js";

const $ = (sel) => document.querySelector(sel);
const t = (key) => chrome.i18n.getMessage(key) || key;

let settings = { ...DEFAULT_NEWTAB_SETTINGS };

function applyI18n() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  }
  for (const el of document.querySelectorAll("[data-i18n-title]")) {
    const msg = chrome.i18n.getMessage(el.dataset.i18nTitle);
    if (msg) el.title = msg;
  }
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) {
    const msg = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
    if (msg) el.placeholder = msg;
  }
}

// ---------- Horloge, date, salutation, ciel ----------

function renderTime() {
  const now = new Date();
  $("#clock").textContent = now.toLocaleTimeString(undefined,
    { hour: "2-digit", minute: "2-digit" });
  $("#date").textContent = now.toLocaleDateString(undefined,
    { weekday: "long", day: "numeric", month: "long" });
  const greeting = t(greetingKey(now.getHours()));
  $("#greeting").textContent =
    settings.name ? `${greeting}, ${settings.name} ☀️` : `${greeting} ☀️`;
  document.body.dataset.sky = skyTheme(now.getHours());
}

// ---------- Raccourcis ----------

function renderShortcuts() {
  const nav = $("#shortcuts");
  nav.replaceChildren();
  for (const shortcut of settings.shortcuts) {
    const a = document.createElement("a");
    a.href = shortcut.url;
    const tile = document.createElement("span");
    tile.className = "tile";
    tile.textContent = letterOf(shortcut);
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = shortcut.name;
    a.append(tile, label);
    nav.appendChild(a);
  }
}

// ---------- Réglages ----------

async function loadSettings() {
  const stored = await chrome.storage.local.get("newtabSettings");
  settings = { ...DEFAULT_NEWTAB_SETTINGS, ...(stored.newtabSettings || {}) };
}

function openSettings() {
  $("#set-name").value = settings.name;
  $("#set-engine").value = settings.engine;
  $("#set-shortcuts").value = settings.shortcuts
    .map((s) => `${s.name} | ${s.url}`).join("\n");
  $("#settings").showModal();
}

async function saveSettings() {
  settings = {
    name: $("#set-name").value.trim(),
    engine: $("#set-engine").value,
    shortcuts: parseShortcuts($("#set-shortcuts").value),
  };
  await chrome.storage.local.set({ newtabSettings: settings });
  $("#set-status").textContent = t("saved");
  setTimeout(() => {
    $("#set-status").textContent = "";
    $("#settings").close();
  }, 600);
  renderTime();
  renderShortcuts();
}

// ---------- Initialisation ----------

async function init() {
  applyI18n();
  await loadSettings();
  renderTime();
  renderShortcuts();
  setInterval(renderTime, 1000);

  $("#search").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = $("#query").value;
    if (query.trim()) location.href = searchUrl(settings.engine, query);
  });
  $("#open-settings").addEventListener("click", openSettings);
  $("#set-save").addEventListener("click", (event) => {
    event.preventDefault();
    saveSettings();
  });
}

init();
