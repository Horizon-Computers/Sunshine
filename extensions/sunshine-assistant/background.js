// Sunshine Assistant — service worker.
// Un clic sur l'icône ouvre le panneau ; le menu contextuel envoie la
// sélection au panneau via chrome.storage.session.

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("Sunshine Assistant:", err));

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ask-sunshine",
    title: "Demander à Sunshine Assistant",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "ask-sunshine" || !info.selectionText) return;
  try {
    await chrome.storage.session.set({ pendingSelection: info.selectionText });
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (err) {
    console.error("Sunshine Assistant:", err);
  }
});
