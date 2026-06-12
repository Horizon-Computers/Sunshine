// Sunshine New Tab — logique pure (partagée page / tests node).

export const ENGINES = {
  brave: "https://search.brave.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  qwant: "https://www.qwant.com/?q=",
  startpage: "https://www.startpage.com/sp/search?query=",
  google: "https://www.google.com/search?q=",
};

export const DEFAULT_NEWTAB_SETTINGS = {
  name: "",            // prénom affiché dans la salutation (optionnel)
  engine: "brave",     // moteur de la barre de recherche
  shortcuts: [
    { name: "Sunshine", url: "https://github.com/Horizon-Computers/Sunshine" },
    { name: "Horizon Computers", url: "https://horizoncomputers.netlify.app" },
    { name: "Wikipédia", url: "https://fr.wikipedia.org" },
  ],
};

// Clé i18n de la salutation selon l'heure locale.
export function greetingKey(hour) {
  if (hour < 6) return "greetingNight";
  if (hour < 12) return "greetingMorning";
  if (hour < 18) return "greetingAfternoon";
  if (hour < 22) return "greetingEvening";
  return "greetingNight";
}

// Ambiance du ciel selon l'heure (gradients définis dans newtab.css).
export function skyTheme(hour) {
  if (hour >= 6 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 18) return "day";
  if (hour >= 18 && hour < 21) return "dusk";
  return "night";
}

// URL de recherche (repli sur Brave Search si moteur inconnu).
export function searchUrl(engine, query) {
  const base = ENGINES[engine] || ENGINES.brave;
  return base + encodeURIComponent((query || "").trim());
}

// Domaine lisible d'une URL ("" en cas d'URL invalide).
export function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Initiale affichée sur la tuile d'un raccourci.
export function letterOf(shortcut) {
  const source = shortcut.name || hostnameOf(shortcut.url) || "?";
  return source.trim().charAt(0).toUpperCase() || "?";
}

// Analyse le texte des réglages « Nom | https://… » (une ligne par raccourci).
export function parseShortcuts(text) {
  const shortcuts = [];
  for (const line of (text || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [name, url] = trimmed.split("|").map((part) => part.trim());
    if (url && hostnameOf(url)) {
      shortcuts.push({ name: name || hostnameOf(url), url });
    }
  }
  return shortcuts;
}
