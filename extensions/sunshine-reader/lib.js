// Sunshine Reader — logique pure du mode lecture (partagée avec les tests).

// Mots par minute retenus pour l'estimation du temps de lecture.
export const WORDS_PER_MINUTE = 200;

export function wordCount(text) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  return words.length;
}

// Temps de lecture estimé, en minutes entières (minimum 1 si du texte).
export function readingTime(words, wpm = WORDS_PER_MINUTE) {
  if (!words || words <= 0) return 0;
  return Math.max(1, Math.round(words / wpm));
}

// Part du texte qui est dans des liens (0 → contenu, 1 → menu/navigation).
export function linkDensity({ textLength = 0, linkTextLength = 0 }) {
  if (textLength <= 0) return 1;
  return Math.min(1, linkTextLength / textLength);
}

// Score d'un candidat « contenu principal » : beaucoup de texte en
// paragraphes, peu de liens. Plus haut = meilleur.
export function scoreCandidate({ textLength = 0, linkTextLength = 0,
                                 paragraphs = 0 }) {
  const density = linkDensity({ textLength, linkTextLength });
  return textLength * (1 - density) + paragraphs * 25;
}

// Nettoie le titre de la page : retire le nom du site en suffixe
// (« Titre - Site », « Titre | Site », « Titre — Site »).
export function cleanTitle(title, hostname = "") {
  let cleaned = (title || "").trim();
  const site = hostname.replace(/^www\./, "").split(".")[0];
  const parts = cleaned.split(/\s+[|\-–—•]\s+/);
  if (parts.length > 1) {
    const last = parts.at(-1).toLowerCase();
    if (site && (last.includes(site) || last.length <= 25)) {
      cleaned = parts.slice(0, -1).join(" - ").trim();
    }
  }
  return cleaned || title || "";
}

// Balises conservées dans la vue lecture.
export const KEEP_TAGS = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI",
  "BLOCKQUOTE", "PRE", "CODE", "EM", "STRONG", "A", "IMG", "FIGURE",
  "FIGCAPTION", "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "BR", "HR",
]);

// Attributs conservés sur les éléments gardés.
export const KEEP_ATTRIBUTES = new Set(["href", "src", "alt", "title"]);
