#!/usr/bin/env python3
"""Génère les artefacts de personnalisation de Sunshine.

Usage:
    python3 scripts/customize.py [--config customize/sunshine.toml]
                                 [--out customize/generated]

À partir du fichier TOML unique `customize/sunshine.toml`, produit dans
`customize/generated/` :

  initial_preferences.json   réglages du premier lancement (page d'accueil,
                             session, Do Not Track, import des favoris…),
                             fusionnés sur branding/initial_preferences.json
  initial_bookmarks.html     favoris préinstallés (format Netscape, importé
                             via distribution.import_bookmarks_from_file)
  theme/manifest.json        thème Sunshine au format extension Chromium
                             (couleurs + fond d'écran du nouvel onglet)
  policies.json              politiques gérées (télémétrie, Rewards/Wallet/
                             VPN/Tor) à installer dans policies/managed/
  flags.conf                 drapeaux de lancement lus par le lanceur
                             /usr/bin/sunshine-browser

Ces fichiers sont ensuite embarqués dans les paquets par
scripts/package_linux.sh. Aucune dépendance hors bibliothèque standard.
"""

import argparse
import copy
import json
import shutil
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Position des favoris dans Chromium : barre de favoris.
BOOKMARKS_HEADER = """<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- Généré par scripts/customize.py — ne pas éditer à la main. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Barre de favoris</H3>
    <DL><p>
"""
BOOKMARKS_FOOTER = """    </DL><p>
</DL><p>
"""

# Correspondance config [privacy] -> clés de politique Chromium/Brave.
POLICY_MAP = {
    "metrics_reporting": "MetricsReportingEnabled",
    "disable_brave_rewards": "BraveRewardsDisabled",
    "disable_brave_wallet": "BraveWalletDisabled",
    "disable_brave_vpn": "BraveVPNDisabled",
    "disable_tor": "TorDisabled",
}

# Clés de couleur du manifest de thème Chromium gérées par [appearance].
THEME_COLOR_KEYS = {
    "frame": "frame",
    "toolbar": "toolbar",
    "tab_text": "tab_text",
    "tab_background_text": "tab_background_text",
    "ntp_background": "ntp_background",
    "ntp_text": "ntp_text",
    "accent": "button_background",
}


def hex_to_rgb(value: str) -> list[int]:
    value = value.lstrip("#")
    if len(value) != 6:
        raise ValueError(f"couleur invalide : #{value} (attendu #RRGGBB)")
    return [int(value[i:i + 2], 16) for i in (0, 2, 4)]


def load_config(path: Path) -> dict:
    with path.open("rb") as fh:
        return tomllib.load(fh)


def sunshine_version() -> str:
    for line in (ROOT / "VERSION").read_text().splitlines():
        if line.startswith("SUNSHINE_VERSION="):
            return line.split("=", 1)[1].strip()
    return "0.0.0"


def build_initial_preferences(config: dict, base: dict, has_bookmarks: bool) -> dict:
    prefs = copy.deepcopy(base)
    startup = config.get("startup", {})
    privacy = config.get("privacy", {})

    if "homepage" in startup:
        prefs["homepage"] = startup["homepage"]
    prefs["homepage_is_newtabpage"] = startup.get("homepage_is_newtabpage", False)
    prefs.setdefault("browser", {})["show_home_button"] = startup.get(
        "show_home_button", True)
    prefs.setdefault("bookmark_bar", {})["show_on_all_tabs"] = startup.get(
        "show_bookmark_bar", False)
    # 1 = restaurer la session précédente, 5 = ouvrir le nouvel onglet.
    prefs.setdefault("session", {})["restore_on_startup"] = (
        1 if startup.get("restore_session") else 5)

    if privacy.get("do_not_track"):
        prefs["enable_do_not_track"] = True

    dist = prefs.setdefault("distribution", {})
    if has_bookmarks:
        dist["import_bookmarks"] = True
        dist["import_bookmarks_from_file"] = \
            "/opt/sunshine-browser/initial_bookmarks.html"
    return prefs


def build_bookmarks_html(config: dict) -> str | None:
    items = config.get("bookmarks", {}).get("items", [])
    if not items:
        return None
    lines = [BOOKMARKS_HEADER]
    for item in items:
        name, url = item["name"], item["url"]
        lines.append(f'        <DT><A HREF="{url}">{name}</A>\n')
    lines.append(BOOKMARKS_FOOTER)
    return "".join(lines)


def build_theme_manifest(config: dict, wallpaper_installed: bool) -> dict:
    appearance = config.get("appearance", {})
    colors = {}
    for cfg_key, manifest_key in THEME_COLOR_KEYS.items():
        if cfg_key in appearance:
            colors[manifest_key] = hex_to_rgb(appearance[cfg_key])
    manifest = {
        "manifest_version": 3,
        "name": "Sunshine Theme",
        "version": sunshine_version(),
        "description": "Thème officiel du navigateur Sunshine",
        "theme": {"colors": colors},
    }
    if wallpaper_installed:
        manifest["theme"]["images"] = {
            "theme_ntp_background": "ntp_background.png"}
        manifest["theme"]["properties"] = {
            "ntp_background_alignment": "center",
            "ntp_background_repeat": "no-repeat",
        }
    return manifest


def build_policies(config: dict) -> dict:
    privacy = config.get("privacy", {})
    return {policy_key: bool(privacy[cfg_key])
            for cfg_key, policy_key in POLICY_MAP.items()
            if cfg_key in privacy}


def build_flags(config: dict) -> str:
    switches = config.get("flags", {}).get("switches", [])
    lines = [
        "# Drapeaux de lancement de Sunshine — un par ligne, '#' commente.",
        "# Généré par scripts/customize.py depuis customize/sunshine.toml.",
    ]
    lines += list(switches)
    return "\n".join(lines) + "\n"


def generate(config: dict, out_dir: Path, base_prefs: dict) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []

    bookmarks_html = build_bookmarks_html(config)
    if bookmarks_html is not None:
        path = out_dir / "initial_bookmarks.html"
        path.write_text(bookmarks_html, encoding="utf-8")
        written.append(path)

    prefs = build_initial_preferences(config, base_prefs,
                                      has_bookmarks=bookmarks_html is not None)
    path = out_dir / "initial_preferences.json"
    path.write_text(json.dumps(prefs, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")
    written.append(path)

    theme_dir = out_dir / "theme"
    theme_dir.mkdir(exist_ok=True)
    wallpaper = config.get("appearance", {}).get("ntp_wallpaper", "")
    wallpaper_installed = False
    if wallpaper:
        src = (ROOT / wallpaper).resolve()
        if src.is_file():
            shutil.copyfile(src, theme_dir / "ntp_background.png")
            written.append(theme_dir / "ntp_background.png")
            wallpaper_installed = True
        else:
            print(f"/!\\ ntp_wallpaper introuvable : {src} — fond ignoré")
    manifest = build_theme_manifest(config, wallpaper_installed)
    path = theme_dir / "manifest.json"
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")
    written.append(path)

    path = out_dir / "policies.json"
    path.write_text(json.dumps(build_policies(config), indent=2,
                               ensure_ascii=False) + "\n", encoding="utf-8")
    written.append(path)

    path = out_dir / "flags.conf"
    path.write_text(build_flags(config), encoding="utf-8")
    written.append(path)

    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path,
                        default=ROOT / "customize" / "sunshine.toml")
    parser.add_argument("--out", type=Path,
                        default=ROOT / "customize" / "generated")
    args = parser.parse_args()

    if not args.config.is_file():
        print(f"Erreur : config introuvable ({args.config})", file=sys.stderr)
        return 1

    config = load_config(args.config)
    base_prefs = json.loads(
        (ROOT / "branding" / "initial_preferences.json").read_text())
    written = generate(config, args.out, base_prefs)
    for path in written:
        print(f"==> {path.relative_to(ROOT)}")
    print(f"==> Personnalisation générée ({len(written)} fichier(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
