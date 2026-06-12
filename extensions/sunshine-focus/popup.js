// Sunshine Focus — réglages et bilan du jour (popup).
import { DEFAULT_FOCUS_SETTINGS, dayKey, statsSummary, weekSummary,
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

function renderWeek(stats) {
  const week = weekSummary(stats, dayKey());
  const max = Math.max(...week.map((d) => d.seconds), 1);
  const container = $("#stats-week");
  container.replaceChildren();
  for (const [index, entry] of week.entries()) {
    const [y, m, d] = entry.day.split("-").map(Number);
    const bar = document.createElement("span");
    bar.className = "bar" + (index === week.length - 1 ? " today" : "");
    bar.title = `${entry.day} — ${formatMinutes(entry.seconds)}`;
    const fill = document.createElement("i");
    fill.style.height = `${Math.round((entry.seconds / max) * 80)}%`;
    const label = document.createElement("span");
    label.textContent = new Date(y, m - 1, d)
      .toLocaleDateString(undefined, { weekday: "narrow" });
    bar.append(fill, label);
    container.appendChild(bar);
  }
}

async function renderStats() {
  const { focusStats } = await chrome.storage.local.get("focusStats");
  const today = statsSummary(focusStats || {}, dayKey());
  $("#stats-sites").replaceChildren();
  if (today.totalSeconds === 0 && today.totalScreens === 0) {
    $("#stats-total").textContent = t("statsEmpty");
  } else {
    $("#stats-total").textContent =
      chrome.i18n.getMessage("statsTotal",
        [formatMinutes(today.totalSeconds), String(today.totalScreens)])
      || `${formatMinutes(today.totalSeconds)} · ${today.totalScreens} écrans`;
    for (const [host, entry] of today.sites.slice(0, 3)) {
      const li = document.createElement("li");
      li.textContent = `${host} — ${formatMinutes(entry.seconds)}`;
      $("#stats-sites").appendChild(li);
    }
  }
  renderWeek(focusStats || {});
}

async function clearStats(event) {
  event.preventDefault();
  await chrome.storage.local.remove("focusStats");
  renderStats();
}

$("#save").addEventListener("click", save);
$("#stats-clear").addEventListener("click", clearStats);
applyI18n();
load();
renderStats();
