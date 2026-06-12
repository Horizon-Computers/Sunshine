# Personnaliser Sunshine

Toute la personnalisation du navigateur se pilote depuis **un seul fichier** :
[`customize/sunshine.toml`](../customize/sunshine.toml). Le générateur
transforme cette config en artefacts que le navigateur sait consommer, et le
packaging les embarque automatiquement.

```bash
# 1. Éditer la config
$EDITOR customize/sunshine.toml

# 2. Générer les artefacts (customize/generated/)
make customize

# 3. Vérifier
make test

# 4. Les paquets embarquent la personnalisation
make package
```

## Ce qui est personnalisable

| Section TOML | Effet | Artefact généré |
|---|---|---|
| `[startup]` | page d'accueil, bouton ⌂, barre de favoris, restauration de session | `initial_preferences.json` |
| `[appearance]` | couleurs du navigateur (cadre, barre d'outils, onglets, nouvel onglet, accent) + fond d'écran du nouvel onglet | `theme/` (extension de thème Chromium) |
| `[privacy]` | Do Not Track, télémétrie, désactivation Rewards / Wallet / VPN / Tor | `initial_preferences.json` + `policies.json` |
| `[bookmarks]` | favoris préinstallés dans la barre | `initial_bookmarks.html` |
| `[flags]` | drapeaux de ligne de commande au lancement | `flags.conf` |

## Comment chaque artefact est consommé

- **`initial_preferences`** : lu par le moteur Chromium au tout premier
  lancement (profil neuf). Installé à côté du binaire dans
  `/opt/sunshine-browser/`.
- **`initial_bookmarks.html`** : importé au premier lancement via
  `distribution.import_bookmarks_from_file`.
- **`theme/`** : extension de thème Chromium standard (couleurs +
  `theme_ntp_background`). Installée dans
  `/opt/sunshine-browser/extensions/sunshine-theme/` ; chargeable via
  `brave://extensions` (mode développeur → « Charger l'extension non
  empaquetée ») en attendant le patch d'installation automatique. Le manifest
  est aussi directement testable dans Brave/Chrome.
- **`policies.json`** : politiques gérées (format
  [Chromium policy](https://chromeenterprise.google/policies/)) installées
  dans `/etc/sunshine-browser/policies/managed/`. Tant que le patch de
  renommage des répertoires n'est pas appliqué, le moteur lit le répertoire
  de Brave : copier ou symlinker vers `/etc/brave/policies/managed/` pour
  activer (attention : affecte aussi un Brave installé sur la même machine).
- **`flags.conf`** : lu par le lanceur `/usr/bin/sunshine-browser` (script
  shell installé par le paquet) qui ajoute chaque drapeau non commenté à la
  ligne de commande. Modifiable après installation sans rebuild :
  `sudo $EDITOR /etc/sunshine-browser/flags.conf`.

## Choix par défaut de Sunshine

La config livrée fait de Sunshine « le moteur de Brave, sans la couche
crypto » : Rewards, Wallet et VPN désactivés par politique, télémétrie coupée,
Do Not Track activé, thème orange soleil. Tor reste disponible pour les
fenêtres privées. Tout cela se change dans le TOML.

## Tester une modification

Les tests unitaires (`make test`) vérifient que la config du dépôt est valide
(sections présentes, couleurs parsables) et que la génération produit des
artefacts cohérents. La CI rejoue en plus un packaging complet avec la
personnalisation embarquée et vérifie le contenu du `.deb`.
