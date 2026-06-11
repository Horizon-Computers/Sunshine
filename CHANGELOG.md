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
