// Sunshine Assistant — service worker : un clic sur l'icône ouvre le panneau.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("Sunshine Assistant:", err));
