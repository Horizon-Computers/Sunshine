// Sunshine Reader — service worker : un clic sur l'icône (dés)active la
// vue lecture sur l'onglet courant (activeTab).
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["reader.js"],
    });
  } catch (err) {
    console.error("Sunshine Reader:", err);
  }
});
