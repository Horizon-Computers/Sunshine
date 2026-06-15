# Sunshine Dev — le mode développeur

Extension intégrée (`extensions/sunshine-dev/`). Un clic sur son icône ouvre
une **fenêtre développeur dédiée** : c'est une fenêtre normale (tu y ouvres
tes onglets comme d'habitude) dont le premier onglet est un **tableau de bord**
qui inspecte l'onglet de ton choix et rassemble l'essentiel du dev web.

Un second clic sur l'icône refocalise la fenêtre dev existante au lieu d'en
ouvrir une autre.

## Le tableau de bord

Choisis la cible dans la liste déroulante (« onglet actif » ou un onglet précis
de la fenêtre), puis **Analyser**. Les informations sont regroupées :

- **Fenêtre & écran** : taille de la fenêtre et du viewport, résolution écran,
  densité de pixels (DPR), profondeur de couleur, orientation.
- **Performance de chargement** : phases du *Navigation Timing* (redirection,
  DNS, TCP, TLS, TTFB, téléchargement, DOM interactif, DOMContentLoaded,
  chargement complet) et *First Contentful Paint*.
- **Ressources** : nombre et poids transféré par catégorie (scripts, CSS,
  images, polices, requêtes fetch/XHR, médias…) avec total.
- **Structure DOM** : nombre d'éléments, profondeur maximale, images (et images
  sans `alt`), liens, scripts, feuilles de style, iframes.
- **SEO & métadonnées** : contrôles notés 🟢/🟡/🔴 (titre, meta description,
  H1 unique, meta viewport, attribut `lang`, URL canonique, charset) avec une
  **note de synthèse A–E**.
- **Sécurité & stockage** : HTTPS, contenu mixte, cookies, `localStorage`,
  `sessionStorage`, présence d'une CSP en `<meta>`.
- **Couleurs & polices** : palette dominante (échantillonnée) et familles de
  polices utilisées.
- **Test responsive** : ouvre la page ciblée dans une fenêtre dimensionnée à un
  *breakpoint* courant (mobile, tablette, laptop, desktop…), avec une case
  **Rotation** pour le mode paysage.
- **Outils** : *Surligner les éléments* (contour CSS sur la page ciblée) et
  *Copier le rapport* (export Markdown dans le presse-papiers).

## Confidentialité

- L'inspection ne se fait **que sur action** (bouton Analyser / outils), via
  `tabs` + `scripting` — aucun script permanent injecté dans les pages.
- Aucune donnée ne quitte le navigateur : tout est calculé localement et
  affiché dans la fenêtre dev.
- Les pages internes (`brave://…`) et protégées ne sont pas inspectables ;
  l'outil le signale proprement.

## Notes techniques

La donnée brute est collectée dans la page par une fonction autonome injectée
(`collect`, dans `dashboard.js`). Toute la mise en forme et le scoring vivent
dans `lib.js` (fonctions pures), couverts par `tests/js/test_dev.mjs` :
formats (octets, ms, rgb→hex), décomposition du *Navigation Timing*,
regroupement des ressources, contrôles SEO et note de synthèse, tailles de
fenêtre responsive, tri de la palette, sérialisation Markdown du rapport.
L'interface est bilingue FR/EN (`_locales/`) et son rendu se vérifie en
chargeant l'extension dans un navigateur.

## Installation (v1)

Comme les autres extensions intégrées : `brave://extensions` → mode
développeur → « Charger l'extension non empaquetée » →
`extensions/sunshine-dev`. L'installation automatique dans Sunshine
nécessitera le patch brave-core.
