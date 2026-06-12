# Distribuer Sunshine

Comment produire et publier les livrables pour chaque plateforme, à partir
d'un build terminé (`make build` sur la machine de la plateforme cible).

## Linux

```bash
make package    # dist/sunshine-browser_<version>_<arch>.deb + .tar.gz portable
make apt-repo   # dépôt APT dans apt/ à partir des .deb de dist/
```

### Dépôt APT (mises à jour automatiques)

`make apt-repo` génère un dépôt APT statique complet (`pool/`, `dists/`,
index `Packages`, fichier `Release` avec sommes SHA-256). Publié tel quel sur
n'importe quel hébergement statique — GitHub Pages par exemple — il donne aux
utilisateurs des mises à jour via `apt upgrade`, comme Brave :

```bash
# Côté utilisateur :
echo "deb [trusted=yes] https://horizon-computers.github.io/Sunshine/apt stable main" \
  | sudo tee /etc/apt/sources.list.d/sunshine.list
sudo apt update && sudo apt install sunshine-browser
```

**Signature (recommandé en production)** : créer une clé GPG dédiée puis
exporter `SUNSHINE_GPG_KEY=<id>` avant `make apt-repo`. Le script produit
alors `Release.gpg`, `InRelease` et la clé publique
`apt/sunshine-archive-keyring.asc` ; les utilisateurs remplacent
`[trusted=yes]` par `[signed-by=/usr/share/keyrings/sunshine.asc]`.

**Publication automatique** : le workflow Pages
(`.github/workflows/pages.yml`) reconstruit le site à chaque release
publiée ; s'il trouve des `.deb` attachés à la dernière release, il génère le
dépôt APT et le publie sous `…/Sunshine/apt`. Il suffit donc d'attacher le
`.deb` à la release GitHub — les utilisateurs voient la mise à jour au
prochain `apt update`. (Pour signer, exécuter `make apt-repo` localement avec
`SUNSHINE_GPG_KEY` et publier manuellement.)

## Windows

```bash
./scripts/package_windows.sh [out/Release]
```

Produit :
- `dist/sunshine-browser-<version>-windows-x64.zip` — **version portable**
  (binaire renommé `sunshine.exe`, personnalisation et extensions incluses) ;
- `dist/sunshine-setup.iss` — script **Inno Setup** générant l'installeur :
  raccourcis menu Démarrer/Bureau, inscription comme navigateur dans les
  Programmes par défaut (associations http/https), désinstalleur. À compiler
  sur Windows : `iscc dist\sunshine-setup.iss` (Inno Setup 6).

Le script tourne aussi bien sur Linux (CI) que dans Git Bash : seul `iscc`
exige Windows.

## macOS

Pas encore de script dédié : utiliser `npm run create_dist Release` (chaîne
amont de Brave) qui produit le `.dmg`, après `make brand` pour que les icônes
`sunshine.icns` soient intégrées. Un script `package_macos.sh` (DMG brandé)
est prévu.

## Récapitulatif des sommes de contrôle

Chaque script de packaging écrit `dist/SHA256SUMS.<plateforme>.txt` ;
les joindre aux releases GitHub avec les binaires.
