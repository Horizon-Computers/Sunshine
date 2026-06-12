// Sunshine Focus — réglages et bilan du jour (popup).
import { DEFAULT_FOCUS_SETTINGS, dayKey, statsSummary,
         formatMinutes } from "./lib.js";

const $ = (sel) => document.querySelector(sel);
const t = (key) => chrome.i18n.getMessage(key) || key;

function applyI18n() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  }
}

async function load() {
  const stored = await chrome.storage.local.get("focusSettings");
  const cfg = { ...DEFAULT_FOCUS_SETTINGS, ...(stored.focusSettings || {}) };
  $("#enabled").checked = cfg.enabled;
  $("#screens").value = cfg.screensBudget;
  $("#minutes").value = cfg.reminderMinutes;
  $("#hide-shorts").checked = cfg.hideShorts;
  $("#sites").value = cfg.sites.join("\n");
}

async function save() {
  const focusSettings = {
    enabled: $("#enabled").checked,
    screensBudget: Math.max(0, Number($("#screens").value) || 0),
    reminderMinutes: Math.max(0, Number($("#minutes").value) || 0),
    hideShorts: $("#hide-shorts").checked,
    sites: $("#sites").value.split("\n")
      .map((s) => s.trim().toLowerCase().replace(/^www\./, ""))
      .filter(Boolean),
  };
  await chrome.storage.local.set({ focusSettings });
  $("#status").textContent = t("saved");
  setTimeout(() => { $("#status").textContent = ""; }, 1500);
}

async function renderStats() {
  const { focusStats } = await chrome.storage.local.get("focusStats");
  const today = statsSummary(focusStats || {}, dayKey());
  if (today.totalSeconds === 0 && today.totalScreens === 0) {
    $("#stats-total").textContent = t("statsEmpty");
    return;
  }
  $("#stats-total").textContent =
    chrome.i18n.getMessage("statsTotal",
      [formatMinutes(today.totalSeconds), String(today.totalScreens)])
    || `${formatMinutes(today.totalSeconds)} · ${today.totalScreens} écrans`;
  const list = $("#stats-sites");
  for (const [host, entry] of today.sites.slice(0, 3)) {
    const li = document.createElement("li");
    li.textContent = `${host} — ${formatMinutes(entry.seconds)}`;
    list.appendChild(li);
  }
}

$("#save").addEventListener("click", save);
applyI18n();
load();
renderStats();
