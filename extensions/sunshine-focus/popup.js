// Sunshine Focus — réglages (popup).
import { DEFAULT_FOCUS_SETTINGS } from "./lib.js";

const $ = (sel) => document.querySelector(sel);

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
  $("#status").textContent = "✓ enregistré";
  setTimeout(() => { $("#status").textContent = ""; }, 1500);
}

$("#save").addEventListener("click", save);
load();
