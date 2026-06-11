#!/usr/bin/env python3
"""Applique le branding Sunshine sur un checkout de brave-core.

Usage:
    python3 scripts/apply_branding.py build/brave-browser/src/brave [--dry-run]

Étapes :
  1. Remplace le nom du produit (« Brave » -> « Sunshine ») dans les fichiers
     de chaînes traduisibles (*.grd / *.grdp) de brave-core. Seules les valeurs
     affichées à l'utilisateur sont touchées, pas les identifiants techniques.
  2. Remplace les icônes d'application par celles générées depuis
     assets/logo/ (lancer scripts/generate_icons.sh d'abord).
  3. Applique les patches du dossier patches/ (git apply).

Ce script couvre le rebranding « visible ». Les identifiants profonds
(répertoires de profil, clés de registre, schémas d'URL brave://) sont laissés
intacts volontairement pour rester compatible avec les mises à jour de l'amont.
"""

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_branding() -> dict:
    branding = {}
    for line in (ROOT / "branding" / "BRANDING").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            branding[key] = value
    return branding


# Remplacements appliqués au texte des messages .grd/.grdp uniquement.
def display_name_replacements(product: str) -> list[tuple[re.Pattern, str]]:
    return [
        (re.compile(r"\bBrave Browser\b"), f"{product} Browser"),
        # « Brave » seul, mais pas les identifiants techniques (brave://,
        # BraveSoftware, brave_xxx, noms de domaine…)
        (re.compile(r"(?<![\w/.:_-])Brave(?![\w/.:_-])"), product),
    ]


def rebrand_strings(brave_core: Path, product: str, dry_run: bool) -> int:
    changed = 0
    grd_files = list(brave_core.rglob("*.grd")) + list(brave_core.rglob("*.grdp"))
    for grd in grd_files:
        if "test" in grd.parts or "node_modules" in grd.parts:
            continue
        try:
            text = grd.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        new_text = text
        for pattern, repl in display_name_replacements(product):
            new_text = pattern.sub(repl, new_text)
        if new_text != text:
            changed += 1
            if not dry_run:
                grd.write_text(new_text, encoding="utf-8")
    print(f"==> Chaînes : {changed} fichier(s) .grd/.grdp rebrandé(s)")
    return changed


# Tailles d'icônes attendues par app/theme/brave/ dans brave-core.
ICON_SIZES = [16, 22, 24, 32, 48, 64, 128, 256]


def replace_icons(brave_core: Path, dry_run: bool) -> None:
    png_dir = ROOT / "assets" / "logo" / "png"
    if not png_dir.is_dir():
        print("/!\\ assets/logo/png/ absent — lancer scripts/generate_icons.sh "
              "d'abord. Icônes ignorées.")
        return
    theme_dir = brave_core / "app" / "theme" / "brave"
    replaced = 0
    for size in ICON_SIZES:
        src = png_dir / f"sunshine-{size}.png"
        if not src.is_file():
            continue
        for dest in theme_dir.rglob(f"product_logo_{size}.png"):
            if not dry_run:
                shutil.copyfile(src, dest)
            replaced += 1
    print(f"==> Icônes : {replaced} fichier(s) product_logo_*.png remplacé(s)")


def apply_patches(brave_core: Path, dry_run: bool) -> None:
    patches = sorted((ROOT / "patches").glob("*.patch"))
    if not patches:
        print("==> Patches : aucun patch à appliquer")
        return
    for patch in patches:
        cmd = ["git", "-C", str(brave_core), "apply", "--check" if dry_run else "--index", str(patch)]
        print(f"==> Patch : {patch.name}")
        subprocess.run(cmd, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("brave_core", type=Path,
                        help="chemin du checkout brave-core (…/src/brave)")
    parser.add_argument("--dry-run", action="store_true",
                        help="affiche ce qui serait modifié sans écrire")
    args = parser.parse_args()

    brave_core = args.brave_core.resolve()
    if not (brave_core / "package.json").is_file():
        print(f"Erreur : {brave_core} ne ressemble pas à un checkout brave-core",
              file=sys.stderr)
        return 1

    branding = load_branding()
    product = branding["PRODUCT_NAME"]
    print(f"==> Rebranding « {product} » sur {brave_core}"
          + (" (dry-run)" if args.dry_run else ""))

    rebrand_strings(brave_core, product, args.dry_run)
    replace_icons(brave_core, args.dry_run)
    apply_patches(brave_core, args.dry_run)
    print("==> Rebranding terminé")
    return 0


if __name__ == "__main__":
    sys.exit(main())
