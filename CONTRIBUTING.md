# Contribuer à Sunshine

Merci de votre intérêt ! Quelques règles simples.

## Mise en place

```bash
git clone https://github.com/Horizon-Computers/Sunshine.git
cd Sunshine
make check          # syntaxe + tests unitaires (rapide, sans checkout Chromium)
```

Le checkout complet des sources (`make init`, ~70 Go) n'est nécessaire que pour
travailler sur les patches ou compiler — pas pour modifier les scripts, le
branding ou la documentation.

## Workflow

1. Créez une branche depuis `main`.
2. `make check` doit passer (la CI le rejoue).
3. Ouvrez une pull request avec une description claire.

## Patches sur brave-core

Les modifications du navigateur lui-même vivent dans `patches/` :

```bash
make init                                  # une fois
# … modifier build/brave-browser/src/brave …
./scripts/make_patch.sh 001-ma-modification
```

Conventions : un patch = un sujet, nommé `NNN-description.patch`, ordre
d'application alphabétique. Vérifiez qu'il s'applique proprement avec
`python3 scripts/apply_branding.py build/brave-browser/src/brave --dry-run`.

## Versions

- `VERSION` est la source de vérité (Sunshine / Brave / Chromium).
- Les montées de version Brave passent par `./scripts/update_upstream.sh`
  (ou la PR automatique du workflow `upstream-watch`).
- Les releases Sunshine passent par `./scripts/bump_version.sh X.Y.Z` puis un
  tag `vX.Y.Z`.
