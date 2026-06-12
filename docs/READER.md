# Sunshine Reader — mode lecture zen

Extension intégrée (`extensions/sunshine-reader/`) : un clic sur son icône
transforme l'article en cours en **vue lecture épurée** ; un second clic (ou
Échap, ou ✕) revient à la page normale.

## Ce que fait la vue lecture

- Détecte le **contenu principal** de la page : candidats (`article`,
  `main`, zones de contenu connues) notés selon la quantité de texte en
  paragraphes et la **densité de liens** (un menu plein de liens score mal) ;
- nettoie le contenu : seuls les éléments éditoriaux sont conservés
  (paragraphes, titres, images, listes, citations, code, tableaux) et tous
  les attributs dangereux ou décoratifs sont retirés (`onclick`, `style`,
  `class`…) ;
- affiche : titre nettoyé (suffixe « | NomDuSite » retiré), domaine,
  **temps de lecture estimé** (200 mots/min), texte serif sur fond crème ;
- contrôles : `A−` / `A+` (taille 14–28 px), `Aa` (serif/sans-serif),
  `✕` ou **Échap** pour fermer.

## Confidentialité et sécurité

- Ne s'exécute **que sur clic** (`activeTab` + `scripting`) — aucun script
  permanent, aucune lecture de page sans action de l'utilisateur ;
- aucun réseau : tout se passe dans l'onglet ;
- rendu dans un **shadow DOM fermé**, contenu passé par une liste blanche
  de balises/attributs (`KEEP_TAGS` / `KEEP_ATTRIBUTES` dans `lib.js`).

## Limites connues (v1)

L'extraction est heuristique : sur des mises en page très exotiques ou des
applications web (pas des articles), le résultat peut être incomplet — dans
ce cas, refermer la vue. Les sélecteurs et le scoring s'affinent dans
`lib.js`, où la logique pure est couverte par `tests/js/test_reader.mjs`
(temps de lecture, densité de liens, scoring article vs navigation,
nettoyage du titre, listes blanches). Le rendu DOM, lui, se vérifie en
chargeant l'extension dans un navigateur.
