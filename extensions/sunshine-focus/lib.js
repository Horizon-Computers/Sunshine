// Sunshine Focus — logique anti-défilement (module partagé
// content script / popup / tests node).

export const DEFAULT_FOCUS_SETTINGS = {
  enabled: true,
  // Pause proposée tous les N écrans de défilement (0 = désactivé).
  screensBudget: 10,
  // Rappel toutes les N minutes de présence active sur le site (0 = off).
  reminderMinutes: 10,
  // Masquer les modules addictifs (Shorts, Reels, tendances…).
  hideShorts: true,
  // Sites surveillés (correspondance par suffixe de domaine).
  sites: [
    "youtube.com", "x.com", "twitter.com", "instagram.com",
    "tiktok.com", "facebook.com", "reddit.com", "linkedin.com",
  ],
};

// Le domaine correspond-il à l'un des sites surveillés ?
// "m.youtube.com" et "youtube.com" matchent "youtube.com".
export function matchesSite(hostname, sites) {
  const host = (hostname || "").toLowerCase();
  return (sites || []).some(
    (site) => host === site || host.endsWith("." + site));
}

// Nombre d'écrans (hauteurs de fenêtre) déjà défilés.
export function screensScrolled(scrollY, viewportHeight) {
  if (!viewportHeight || viewportHeight <= 0) return 0;
  return Math.floor(scrollY / viewportHeight);
}

// Faut-il proposer une pause ? Vrai à chaque tranche de `budget` écrans
// depuis la dernière pause acceptée/refusée.
export function shouldWarn(screens, budget, lastWarnedScreens) {
  if (!budget || budget <= 0) return false;
  return screens >= budget && screens - lastWarnedScreens >= budget;
}

// Modules addictifs masqués par site (sélecteurs CSS, susceptibles
// d'évoluer avec les sites — voir docs/FOCUS.md).
export const HIDE_RULES = {
  "youtube.com": [
    "ytd-rich-shelf-renderer[is-shorts]",
    "ytd-reel-shelf-renderer",
    "ytm-shorts-lockup-view-model",
    'ytd-guide-entry-renderer a[title="Shorts"]',
  ],
  "x.com": [
    '[data-testid="sidebarColumn"] section',
    '[data-testid="trend"]',
  ],
  "twitter.com": [
    '[data-testid="sidebarColumn"] section',
    '[data-testid="trend"]',
  ],
  "instagram.com": [
    'a[href^="/reels/"]',
    'a[href^="/explore/"]',
  ],
  "facebook.com": [
    '[aria-label="Reels"]',
    'a[href^="/reel/"]',
  ],
  "reddit.com": [
    "shreddit-gallery-carousel",
    '[noun="popular_posts"]',
  ],
};

// CSS de masquage pour un domaine donné ("" si rien à masquer).
export function cssForHost(hostname, rules = HIDE_RULES) {
  for (const [site, selectors] of Object.entries(rules)) {
    if (matchesSite(hostname, [site]) && selectors.length) {
      return selectors.join(",\n") + " { display: none !important; }";
    }
  }
  return "";
}

// ---------- Statistiques locales ----------
// Structure : { "AAAA-MM-JJ": { "site.com": { seconds, screens } } }.
// Stockées dans chrome.storage.local, conservées STATS_KEEP_DAYS jours,
// jamais transmises hors du navigateur.

export const STATS_KEEP_DAYS = 7;

// Clé du jour en date locale (AAAA-MM-JJ).
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Ajoute de l'activité (secondes visibles, écrans défilés) pour un site.
export function recordActivity(stats, day, host, { seconds = 0, screens = 0 } = {}) {
  const days = stats || {};
  const sites = (days[day] ||= {});
  const entry = (sites[host] ||= { seconds: 0, screens: 0 });
  entry.seconds += seconds;
  entry.screens += screens;
  return days;
}

// Ne conserve que les `keepDays` jours les plus récents.
export function pruneStats(stats, keepDays = STATS_KEEP_DAYS) {
  const days = Object.keys(stats).sort().reverse();
  for (const day of days.slice(keepDays)) delete stats[day];
  return stats;
}

// Bilan d'une journée : totaux + sites triés par temps décroissant.
export function statsSummary(stats, day) {
  const sites = Object.entries((stats || {})[day] || {})
    .sort((a, b) => b[1].seconds - a[1].seconds);
  return {
    totalSeconds: sites.reduce((n, [, e]) => n + e.seconds, 0),
    totalScreens: sites.reduce((n, [, e]) => n + e.screens, 0),
    sites,
  };
}

// Durée lisible : "< 1 min", "12 min", "2 h 05".
export function formatMinutes(seconds) {
  if (seconds < 60) return "< 1 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

// Texte du rappel de temps (minutes entières).
export function reminderMessage(minutes) {
  return `Cela fait ${minutes} minute${minutes > 1 ? "s" : ""} que tu es ` +
         "sur ce site. C'est peut-être le moment d'une pause ?";
}

// Texte de la pause défilement.
export function scrollMessage(screens) {
  return `Tu as fait défiler l'équivalent de ${screens} écrans. ` +
         "Tu y trouves encore ce que tu cherchais ?";
}
