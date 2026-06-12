# Changelog Sunshine

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/).
Chaque release indique la version de Brave/Chromium embarquée.

## [Unreleased]

### Ajouté
- Tests unitaires du rebranding (`tests/`, 15 tests) exécutés en CI.
- Génération des icônes Windows (`sunshine.ico`) et macOS (`sunshine.icns`)
  dans `scripts/generate_icons.sh` ; `apply_branding.py` les installe dans
  brave-core.
- Assets de packaging Linux : `branding/linux/sunshine-browser.desktop`.
- Préférences par défaut du premier lancement :
  `branding/initial_preferences.json`.
- `scripts/make_patch.sh` : export des modifications de brave-core en patch.
- `scripts/bump_version.sh` : bump de version + section changelog + tag.
- `Makefile` avec les cibles courantes (`make help`).
- `scripts/doctor.sh` : diagnostic de la machine de build (disque, RAM,
  outils) avant `init.sh`.
- Logo wordmark (`assets/logo/sunshine-wordmark.svg`) affiché en tête de
  README.
- `SECURITY.md`, templates d'issues et de pull request.
- `scripts/package_linux.sh` (+ `make package`) : construction du paquet
  Debian (`.deb`) et de l'archive portable Linux avec lanceur, icônes,
  `initial_preferences`, sandbox setuid et sommes SHA-256.
- Site vitrine du projet (`site/`) déployé sur GitHub Pages
  (`.github/workflows/pages.yml`).
- `README.en.md` (version anglaise) ; CI : shellcheck + test de bout en bout
  du packaging Linux sur un build factice.
- **Système de personnalisation complet** piloté par `customize/sunshine.toml`
  (`make customize`, voir `docs/CUSTOMIZE.md`) : page d'accueil et démarrage,
  thème couleurs/fond d'écran (extension de thème Chromium), favoris
  préinstallés, politiques de vie privée (télémétrie, Rewards/Wallet/VPN/Tor),
  drapeaux de lancement éditables dans `/etc/sunshine-browser/flags.conf`.
  Le paquet Linux embarque le tout ; le lanceur `/usr/bin/sunshine-browser`
  devient un script qui applique les drapeaux. 13 tests unitaires dédiés +
  test d'installation réelle du `.deb` en CI.
- **Sunshine Assistant** (`extensions/sunshine-assistant/`) : assistant IA de
  navigation en panneau latéral, propulsé par **Mistral 7B** — backend Ollama
  local (`mistral:7b`, privé, par défaut) ou API Mistral AI
  (`open-mistral-7b`). Résumé / points clés / traduction / explication de la
  page courante, chat libre avec historique, réponses en streaming, réglages
  intégrés avec test de connexion. Embarqué dans le paquet Linux. 12 tests
  JavaScript (`node --test`) en CI. Docs : `docs/ASSISTANT.md`.
- Distribution multi-plateforme (`docs/DISTRIBUTION.md`) :
  `scripts/package_windows.sh` (zip portable Windows avec `sunshine.exe`,
  personnalisation et extensions + script Inno Setup généré : raccourcis,
  associations http/https, désinstalleur) et `scripts/make_apt_repo.sh`
  (dépôt APT statique signable par GPG pour les mises à jour `apt upgrade`,
  hébergeable sur GitHub Pages). Les deux validés de bout en bout en CI,
  y compris la résolution réelle du paquet par apt.
- Assistant : menu contextuel « Demander à Sunshine Assistant » sur le texte
  sélectionné (clic droit → le panneau s'ouvre et explique le passage),
  bouton 🗨+ nouvelle conversation, carte assistant sur le site vitrine.
- **Sunshine Focus** (`extensions/sunshine-focus/`) : anti-défilement infini
  sur toutes les plateformes — pause douce après N écrans défilés (10 par
  défaut), rappel du temps de présence actif (10 min), masquage des modules
  addictifs (Shorts YouTube, tendances X, Reels Instagram/Facebook…),
  réglages par popup (sites surveillés, seuils, on/off). Aucune collecte de
  données. 9 tests JS dédiés. Docs : `docs/FOCUS.md`.

## [1.0.0] - 2026-06-11 (Brave 1.91.171, Chromium 149.0.7827.103)

### Ajouté
- Structure initiale du dépôt meta (modèle `brave/brave-browser`).
- Logo v1 « soleil levant » en SVG (bannière + icône d'application).
- `scripts/init.sh` : checkout de Brave à la version épinglée dans `VERSION`.
- `scripts/apply_branding.py` : rebranding Sunshine (chaînes `.grd`, icônes,
  patches) en préservant les identifiants techniques (`brave://`, domaines…).
- `scripts/generate_icons.sh` et `scripts/update_upstream.sh`.
- Workflows GitHub Actions : CI, veille quotidienne des releases Brave
  (PR automatique), publication de release au tag `v*`.
- Documentation de build (`docs/BUILD.md`) et licence MPL-2.0.
