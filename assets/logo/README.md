# Logo Sunshine — v1

- `sunshine-logo.svg` — logo « bannière » (soleil levant sur l'horizon),
  reproduction vectorielle du dessin original v1.
- `sunshine-icon.svg` — déclinaison carrée pour les icônes d'application
  (fenêtre, lanceur, installeur).

Couleur principale : `#E8A23C` (orange soleil). Fond icône : `#FFF8EE`.

Génération des PNG à toutes les tailles requises par Chromium/Brave
(16, 22, 24, 32, 48, 64, 128, 256, 512 px) :

```bash
./scripts/generate_icons.sh
```

Les PNG sont écrits dans `assets/logo/png/` puis copiés dans brave-core par
`scripts/apply_branding.py`.
