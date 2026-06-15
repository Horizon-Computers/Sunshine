// Sunshine Dev — service worker : un clic sur l'icône ouvre (ou refocalise)
// une fenêtre développeur dédiée. Cette fenêtre est une fenêtre normale : on y
// ouvre ses onglets habituels, et le premier onglet est le tableau de bord dev.
const DASHBOARD = "devwindow.html";

chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL(DASHBOARD);

  // Réutilise la fenêtre dev existante si elle est encore ouverte.
  const { devWindowId } = await chrome.storage.session.get("devWindowId");
  if (devWindowId != null) {
    try {
      const win = await chrome.windows.get(devWindowId, { populate: true });
      const dash = win.tabs.find((t) => t.url && t.url.startsWith(url));
      await chrome.windows.update(devWindowId, { focused: true });
      if (dash) await chrome.tabs.update(dash.id, { active: true });
      return;
    } catch {
      // Fenêtre fermée entre-temps : on en ouvre une neuve.
    }
  }

  const win = await chrome.windows.create({
    url,
    type: "normal",
    width: 1280,
    height: 860,
    focused: true,
  });
  await chrome.storage.session.set({ devWindowId: win.id });
});
