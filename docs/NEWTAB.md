# Sunshine New Tab — la page « nouvel onglet »

Extension intégrée (`extensions/sunshine-newtab/`) qui remplace la page
« nouvel onglet » par celle de Sunshine.

## Contenu

- **Horloge** et date (format de la locale du navigateur) ;
- **Salutation** selon l'heure (« Bonjour », « Bonsoir »…), personnalisable
  avec un prénom ;
- **Ciel dégradé** qui suit la journée — aube (6 h-9 h), jour (9 h-18 h),
  crépuscule (18 h-21 h), nuit — dans la palette du logo Sunshine ;
- **Barre de recherche** : Brave Search par défaut, au choix DuckDuckGo,
  Qwant, Startpage ou Google ;
- **Raccourcis** éditables (tuiles à initiale), format
  `Nom | https://exemple.fr` dans les réglages (⚙ en bas à droite).

## Vie privée

Aucune requête réseau tant que l'utilisateur ne recherche pas ou ne clique
pas : pas de flux d'actualités, pas de météo tierce, pas de télémétrie.
Les réglages vivent dans `chrome.storage.local`.

## Tests

`tests/js/test_newtab.mjs` : bornes des salutations et des thèmes de ciel
(présence des gradients dans le CSS), encodage des recherches et repli sur
Brave Search, moteurs 100 % HTTPS, parsing des raccourcis (lignes invalides
ignorées, noms déduits du domaine), réglages par défaut valides. L'i18n FR/EN
est couverte par la suite `test_i18n.mjs` commune.
