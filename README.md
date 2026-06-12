<p align="center">
  <img src="assets/logo/sunshine-wordmark.svg" alt="Sunshine Browser" width="560">
</p>

# ☀️ Sunshine Browser

**Sunshine** est un navigateur web pour PC (Windows / macOS / Linux) basé sur
[Brave](https://github.com/brave/brave-core), lui-même basé sur Chromium.

🇬🇧 [English version](README.en.md) · 🌐 Site : `site/` (déployé via GitHub Pages)

Ce dépôt est le dépôt « meta » du projet (sur le modèle de
[`brave/brave-browser`](https://github.com/brave/brave-browser)) : il contient le
branding, les scripts de synchronisation avec l'amont (upstream), les patches de
rebranding et l'automatisation des versions. Le code du navigateur lui-même
(brave-core + Chromium, plusieurs dizaines de Go) est téléchargé au moment du
build et n'est **pas** versionné ici.

| | Version |
|---|---|
| Sunshine | `1.0.0` |
| Brave (amont) | `1.91.171` |
| Chromium | `149.0.7827.103` |

Les versions épinglées vivent dans le fichier [`VERSION`](VERSION).

## 🗂 Structure du dépôt

```
.
├── VERSION                  # Versions épinglées (Sunshine / Brave / Chromium)
├── assets/logo/             # Logo Sunshine (source SVG)
├── branding/                # Constantes de marque (nom, identifiants, couleurs)
├── customize/sunshine.toml  # Personnalisation du navigateur (voir docs/CUSTOMIZE.md)
├── extensions/              # Extensions intégrées (Assistant IA, Focus, Nouvel onglet)
├── patches/                 # Patches appliqués sur brave-core après checkout
├── scripts/
│   ├── init.sh              # Clone brave-browser/brave-core à la version épinglée
│   ├── apply_branding.py    # Applique le rebranding Sunshine sur brave-core
│   ├── generate_icons.sh    # Génère PNG + ICO + ICNS depuis le SVG
│   ├── package_linux.sh     # .deb + archive portable Linux
│   ├── package_windows.sh   # zip portable Windows + installeur Inno Setup
│   ├── make_apt_repo.sh     # Dépôt APT (mises à jour automatiques)
│   ├── make_patch.sh        # Exporte les modifs de brave-core en patch
│   ├── bump_version.sh      # Bump de version Sunshine + changelog
│   └── update_upstream.sh   # Met à jour la version Brave épinglée
├── tests/                   # Tests unitaires (make test)
├── docs/BUILD.md            # Instructions de build détaillées
└── .github/workflows/       # CI + veille des versions Brave + releases
```

## 🚀 Build rapide

> ⚠️ Compiler un navigateur basé sur Chromium demande une machine costaude :
> **16 Go de RAM minimum (32 recommandés), ~100 Go de disque libre**, et
> plusieurs heures de compilation. Voir [docs/BUILD.md](docs/BUILD.md).

```bash
# 0. Vérifie que la machine est prête (disque, RAM, outils)
./scripts/doctor.sh

# 1. Récupère brave-browser + brave-core + Chromium à la version épinglée
./scripts/init.sh

# 2. Applique le branding Sunshine (nom, icônes, patches)
python3 scripts/apply_branding.py build/brave-browser/src/brave

# 3. Compile
cd build/brave-browser
npm run build Release
```

## 🔄 Suivi des versions de Brave

Le workflow [`upstream-watch.yml`](.github/workflows/upstream-watch.yml) vérifie
chaque jour la dernière release de Brave. Quand une nouvelle version sort, il
ouvre automatiquement une pull request qui met à jour le fichier `VERSION`.
Après merge et build, une release Sunshine est publiée via
[`release.yml`](.github/workflows/release.yml) en poussant un tag `v*`.

Pour mettre à jour manuellement :

```bash
./scripts/update_upstream.sh          # récupère la dernière version de Brave
./scripts/update_upstream.sh 1.92.50  # ou une version précise
```

## 🎨 Personnalisation

Page d'accueil, couleurs du thème, favoris préinstallés, vie privée
(télémétrie, Rewards/Wallet/VPN), drapeaux de lancement : tout se règle dans
[`customize/sunshine.toml`](customize/sunshine.toml) puis `make customize`.
Par défaut, Sunshine est « le moteur de Brave sans la couche crypto ».
Voir [docs/CUSTOMIZE.md](docs/CUSTOMIZE.md).

## 🤖 Assistant IA (Mistral 7B)

Sunshine embarque **Sunshine Assistant**, un panneau latéral qui résume,
traduit et explique la page courante et répond à tes questions — propulsé par
**Mistral 7B**, en local via [Ollama](https://ollama.com) (privé, par défaut)
ou via l'API Mistral AI. Voir [docs/ASSISTANT.md](docs/ASSISTANT.md).

## 🧘 Anti-défilement infini

**Sunshine Focus** propose une pause après N écrans défilés, rappelle le
temps passé sur les sites à flux infini et masque Shorts, Reels et
tendances. Configurable par site, aucune donnée collectée.
Voir [docs/FOCUS.md](docs/FOCUS.md).

## 🌅 Nouvel onglet

Horloge, salutation, recherche (Brave Search par défaut) et raccourcis, sous
un ciel qui suit la journée — sans flux d'actualités ni télémétrie.
Voir [docs/NEWTAB.md](docs/NEWTAB.md).

## 🖼 Logo

Le logo v1 (soleil levant) est dans [`assets/logo/`](assets/logo/). Les icônes
PNG à toutes les tailles sont générées avec `scripts/generate_icons.sh`.

## 📜 Licence

Sunshine est distribué sous licence [MPL-2.0](LICENSE), comme Brave.
Sunshine n'est pas affilié à Brave Software, Inc. « Brave » et « Chromium »
sont des marques de leurs propriétaires respectifs.
