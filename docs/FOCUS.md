# Sunshine Focus — anti-défilement infini

Extension intégrée (`extensions/sunshine-focus/`) qui aide à reprendre le
contrôle sur les sites à défilement infini. Embarquée dans les paquets de
toutes les plateformes (Windows, macOS, Linux) puisqu'elle vit dans le
navigateur.

## Quatre protections

1. **Garde-fou de défilement** : après l'équivalent de *N* écrans défilés
   (10 par défaut), une pause douce s'affiche — « Tu as fait défiler
   l'équivalent de N écrans. Tu y trouves encore ce que tu cherchais ? » —
   avec deux choix : *Remonter en haut* ou *Continuer*. La pause suivante
   n'arrive qu'après *N* écrans supplémentaires.
2. **Rappel de temps de présence** : toutes les *N* minutes **actives**
   (onglet visible uniquement, 10 min par défaut), un rappel du temps passé
   sur le site.
3. **Masquage des modules addictifs** : Shorts YouTube, tendances X/Twitter,
   Reels/Explorer Instagram, Reels Facebook, carrousels Reddit — masqués par
   CSS injectée.
4. **Bilan du jour** : le popup affiche le temps de défilement **actif**
   (onglet visible) et le nombre d'écrans défilés aujourd'hui, avec le top 3
   des sites. Prendre conscience, c'est déjà reprendre la main.

## Réglages

Clic sur l'icône **Sunshine Focus** :

- activer/désactiver globalement ;
- nombre d'écrans avant pause (0 = désactivé) ;
- minutes avant rappel (0 = désactivé) ;
- masquage Shorts/Reels on/off ;
- liste des sites surveillés (par défaut : YouTube, X/Twitter, Instagram,
  TikTok, Facebook, Reddit, LinkedIn — correspondance par domaine, les
  sous-domaines sont couverts).

Sur les sites non listés, l'extension ne fait **rien** : pas de script
actif, pas de mesure, pas de collecte. Aucune donnée ne quitte le
navigateur : réglages et statistiques vivent dans `chrome.storage.local`,
et les statistiques sont automatiquement purgées au-delà de **7 jours**.
Granularité volontairement grossière (site + jour), pas d'URL ni d'historique.

## Notes techniques

- La superposition de pause est rendue dans un **shadow DOM fermé** pour ne
  pas interférer avec le CSS des sites (et réciproquement).
- Les sélecteurs de masquage (`HIDE_RULES` dans `lib.js`) évoluent avec les
  sites : toute PR de mise à jour est bienvenue.
- Logique pure dans `lib.js`, couverte par `tests/js/test_focus.mjs`
  (correspondance de domaines, calcul d'écrans, cadence des pauses, CSS de
  masquage, messages).
- Comme les autres extensions intégrées, chargement v1 via
  `brave://extensions` → « Charger l'extension non empaquetée » en attendant
  le patch d'installation automatique.
