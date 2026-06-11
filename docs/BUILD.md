# Compiler Sunshine

Sunshine se construit exactement comme Brave : ce dépôt pilote un checkout de
[`brave/brave-browser`](https://github.com/brave/brave-browser) à la version
épinglée dans [`VERSION`](../VERSION), sur lequel on applique le branding
Sunshine avant compilation.

## Prérequis matériels

| Ressource | Minimum | Recommandé |
|---|---|---|
| RAM | 16 Go | 32 Go+ |
| Disque libre | 100 Go (SSD) | 150 Go (NVMe) |
| CPU | 4 cœurs | 16 cœurs+ |
| Durée (1er build) | ~4–8 h | ~1–2 h |

## Prérequis logiciels

Identiques à Brave, par plateforme :
- **Linux** : voir [les prérequis Linux de Brave](https://github.com/brave/brave-browser/wiki/Linux-Development-Environment)
- **Windows** : Visual Studio 2022, SDK Windows — [guide Brave](https://github.com/brave/brave-browser/wiki/Windows-Development-Environment)
- **macOS** : Xcode — [guide Brave](https://github.com/brave/brave-browser/wiki/macOS-Development-Environment)

Dans tous les cas : Node.js ≥ 20, npm, Python 3, git.
Pour les icônes : `librsvg2-bin` (ou Inkscape / ImageMagick).

## Étapes

```bash
# 1. Générer les icônes PNG depuis le SVG
./scripts/generate_icons.sh

# 2. Cloner brave-browser à la version épinglée et initialiser les sources
#    (télécharge brave-core + Chromium : ~70 Go, long)
./scripts/init.sh

# 3. Appliquer le branding Sunshine sur brave-core
python3 scripts/apply_branding.py build/brave-browser/src/brave

# 4. Compiler en Release
cd build/brave-browser
npm run build Release

# 5. (Optionnel) créer les paquets d'installation
npm run create_dist Release
```

Le binaire de développement se lance avec `npm start Release` depuis
`build/brave-browser`. Les cibles `make` équivalentes : `make icons init brand
build dist` (voir `make help`).

## Packaging

- **Linux** : `make package` (ou `./scripts/package_linux.sh`) construit
  directement `dist/sunshine-browser_<version>_<arch>.deb` et une archive
  portable `.tar.gz` depuis `out/Release` : binaire dans
  `/opt/sunshine-browser/`, lanceur `.desktop`, icônes hicolor, lien
  `/usr/bin/sunshine-browser`, `initial_preferences` et sommes SHA-256.
- **Premier lancement** : copier `branding/initial_preferences.json` sous le
  nom `initial_preferences` à côté du binaire dans le paquet final pour
  appliquer les réglages par défaut de Sunshine (page d'accueil, pas d'import,
  pas de prompt « navigateur par défaut »).
- **Windows/macOS** : `scripts/generate_icons.sh` produit `sunshine.ico` et
  `sunshine.icns` ; `apply_branding.py` les installe dans brave-core avant le
  build, ils sont donc intégrés aux exécutables.

## Publier une release

1. Mettre à jour l'amont si besoin : `./scripts/update_upstream.sh`
2. Bumper `SUNSHINE_VERSION` dans `VERSION`
3. Commit + tag + push :
   ```bash
   git commit -am "Sunshine 1.1.0 (Brave 1.92.x)"
   git tag v1.1.0 && git push origin main v1.1.0
   ```
4. Le workflow `release.yml` crée la release GitHub ; attacher ensuite les
   binaires produits à l'étape « create_dist » (manuellement ou via un runner
   self-hosted — les runners GitHub hébergés ne peuvent pas compiler Chromium).

## Limites connues du rebranding v1

`apply_branding.py` rebrande ce qui est **visible** : nom du produit dans
l'interface et icônes. Restent volontairement inchangés pour l'instant (pour
faciliter le suivi de l'amont) :
- le schéma d'URL interne `brave://` ;
- les répertoires de profil utilisateur (`BraveSoftware/…`) ;
- les services réseau Brave (mise à jour des composants, etc.).

Ces points pourront être traités par des patches dédiés dans `patches/`.
