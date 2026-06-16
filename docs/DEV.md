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
- **Performance de chargement** : un **budget** noté (TTFB, FCP, chargement
  complet contre des seuils usuels) puis le détail des phases du
  *Navigation Timing* (redirection, DNS, TCP, TLS, TTFB, téléchargement, DOM
  interactif, DOMContentLoaded, chargement complet) et *First Contentful
  Paint*.
- **Ressources** : nombre et poids transféré par catégorie (scripts, CSS,
  images, polices, requêtes fetch/XHR, médias…) avec total, et le **top 5 des
  ressources les plus lourdes**.
- **Chronologie des requêtes** : une *waterfall* des requêtes les plus longues,
  positionnées sur une échelle de temps commune et colorées par type.
- **Structure DOM** : nombre d'éléments, profondeur maximale, images (et images
  sans `alt`), liens, scripts, feuilles de style, iframes.
- **SEO & métadonnées** : contrôles notés 🟢/🟡/🔴 (titre, meta description,
  H1 unique, meta viewport, attribut `lang`, URL canonique, charset) avec une
  **note de synthèse A–E**.
- **Accessibilité** : contrôles notés (images avec texte alt, champs étiquetés,
  liens et boutons nommés, langue et titre de page) avec note A–E.
- **Aperçu social** : métadonnées Open Graph / Twitter (titre, description,
  image) telles qu'un réseau social les afficherait.
- **Sécurité & stockage** : HTTPS, contenu mixte, cookies, `localStorage`,
  `sessionStorage`, présence d'une CSP en `<meta>`.
- **Couleurs & polices** : palette dominante (échantillonnée) et familles de
  polices utilisées.
- **Vérificateur de contraste** : deux sélecteurs de couleur, ratio de
  contraste et niveau **WCAG** (AA/AAA) calculés en direct.
- **Test responsive** : ouvre la page ciblée dans une fenêtre dimensionnée à un
  *breakpoint* courant (mobile, tablette, laptop, desktop…), avec une case
  **Rotation** pour le mode paysage.
- **Outils** : *Surligner les éléments* (contour CSS sur la page ciblée),
  *Copier le rapport* (Markdown) et *Exporter en JSON*.

- **Outils** : *Surligner les éléments*, *Inspecter au survol* (contour +
  étiquette `balise#id · L×H` sous le curseur), *Copier le rapport* (Markdown)
  et *Exporter en JSON*.
- **Historique** : chaque analyse manuelle est enregistrée localement (note
  globale + horodatage), avec l'**écart** par rapport à la précédente analyse
  de la même URL — pour suivre une page à l'optimisation.

Une **note globale** (en-tête) combine les scores SEO, performance et
accessibilité. Une case **Auto** réanalyse l'onglet toutes les 5 secondes
(sans alimenter l'historique).

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
formats (octets, ms, rgb→hex, URLs courtes), décomposition du
*Navigation Timing*, regroupement et tri des ressources, *waterfall*
normalisée, contrôles SEO / performance / accessibilité et notes de synthèse,
contraste WCAG, score global, historique (cumul, écarts), libellé d'élément,
tailles de fenêtre responsive, palette, export Markdown et JSON.

Les statistiques (réglages et historique) restent dans
`chrome.storage.local` ; l'inspection au survol n'agit que sur action et ne
transmet rien.
L'interface est bilingue FR/EN (`_locales/`) et son rendu se vérifie en
chargeant l'extension dans un navigateur.

## Installation (v1)

Comme les autres extensions intégrées : `brave://extensions` → mode
développeur → « Charger l'extension non empaquetée » →
`extensions/sunshine-dev`. L'installation automatique dans Sunshine
nécessitera le patch brave-core.
