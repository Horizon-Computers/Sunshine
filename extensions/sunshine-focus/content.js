// Sunshine Focus — content script : garde-fou de défilement, rappel de
// temps et masquage des modules addictifs sur les sites surveillés.
(async () => {
  const lib = await import(chrome.runtime.getURL("lib.js"));

  const stored = await chrome.storage.local.get("focusSettings");
  const cfg = { ...lib.DEFAULT_FOCUS_SETTINGS, ...(stored.focusSettings || {}) };
  if (!cfg.enabled || !lib.matchesSite(location.hostname, cfg.sites)) return;

  // --- Masquage des modules addictifs (Shorts, Reels, tendances…) ---
  if (cfg.hideShorts) {
    const css = lib.cssForHost(location.hostname);
    if (css) {
      const style = document.createElement("style");
      style.id = "sunshine-focus-hide";
      style.textContent = css;
      document.documentElement.appendChild(style);
    }
  }

  // --- Superposition de pause (isolée dans un shadow DOM) ---
  let overlayOpen = false;
  function showBreak(message) {
    if (overlayOpen) return;
    overlayOpen = true;
    const host = document.createElement("div");
    host.id = "sunshine-focus-overlay";
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `
      <style>
        .veil { position: fixed; inset: 0; z-index: 2147483647;
                background: rgba(58,46,30,.45);
                display: flex; align-items: flex-end; justify-content: center; }
        .card { background: #FFF8EE; color: #3A2E1E; max-width: 430px;
                margin: 0 16px 28px; padding: 20px 22px; border-radius: 16px;
                font: 15px/1.5 "Segoe UI", Arial, sans-serif;
                box-shadow: 0 8px 30px rgba(0,0,0,.3); text-align: center; }
        .sun { font-size: 30px; }
        p { margin: 10px 0 16px; }
        button { margin: 0 5px; padding: 9px 16px; border: 0;
                 border-radius: 9px; font: inherit; cursor: pointer; }
        .primary { background: #E8A23C; color: #fff; }
        .ghost { background: transparent; color: #C9842A;
                 border: 2px solid #E8A23C; }
      </style>
      <div class="veil">
        <div class="card">
          <div class="sun">☀️</div>
          <p></p>
          <button class="primary"></button>
          <button class="ghost"></button>
        </div>
      </div>`;
    shadow.querySelector("p").textContent = message;
    const primary = shadow.querySelector(".primary");
    const ghost = shadow.querySelector(".ghost");
    primary.textContent =
      chrome.i18n.getMessage("btnTop") || "Remonter en haut";
    ghost.textContent =
      chrome.i18n.getMessage("btnContinue") || "Continuer";
    primary.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      close();
    });
    shadow.querySelector(".ghost").addEventListener("click", close);
    function close() {
      host.remove();
      overlayOpen = false;
    }
    document.documentElement.appendChild(host);
  }

  // --- Garde-fou de défilement ---
  let lastWarnedScreens = 0;
  let scrollTimer = null;
  addEventListener("scroll", () => {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => {
      scrollTimer = null;
      const screens = lib.screensScrolled(scrollY, innerHeight);
      if (lib.shouldWarn(screens, cfg.screensBudget, lastWarnedScreens)) {
        lastWarnedScreens = screens;
        showBreak(chrome.i18n.getMessage("scrollMsg", [String(screens)])
                  || lib.scrollMessage(screens));
      }
    }, 400);
  }, { passive: true });

  // --- Rappel de temps de présence (onglet visible uniquement) ---
  if (cfg.reminderMinutes > 0) {
    const TICK = 5; // secondes
    let visibleSeconds = 0;
    setInterval(() => {
      if (document.visibilityState !== "visible") return;
      visibleSeconds += TICK;
      if (visibleSeconds % (cfg.reminderMinutes * 60) === 0) {
        const minutes = Math.round(visibleSeconds / 60);
        showBreak(chrome.i18n.getMessage("reminderMsg", [String(minutes)])
                  || lib.reminderMessage(minutes));
      }
    }, TICK * 1000);
  }
})();
