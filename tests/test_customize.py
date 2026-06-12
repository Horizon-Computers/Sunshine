#!/usr/bin/env python3
"""Tests unitaires de scripts/customize.py (système de personnalisation)."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import customize  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


class TestHexToRgb(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(customize.hex_to_rgb("#E8A23C"), [232, 162, 60])
        self.assertEqual(customize.hex_to_rgb("000000"), [0, 0, 0])
        self.assertEqual(customize.hex_to_rgb("#FFFFFF"), [255, 255, 255])

    def test_invalid(self):
        with self.assertRaises(ValueError):
            customize.hex_to_rgb("#FFF")


class TestRepoConfig(unittest.TestCase):
    """La config livrée dans le dépôt doit être valide et complète."""

    @classmethod
    def setUpClass(cls):
        cls.config = customize.load_config(ROOT / "customize" / "sunshine.toml")

    def test_sections_present(self):
        for section in ("startup", "appearance", "privacy", "bookmarks", "flags"):
            self.assertIn(section, self.config)

    def test_appearance_colors_parse(self):
        for key in customize.THEME_COLOR_KEYS:
            self.assertIn(key, self.config["appearance"])
            customize.hex_to_rgb(self.config["appearance"][key])


class TestGeneration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = customize.load_config(ROOT / "customize" / "sunshine.toml")
        cls.base_prefs = json.loads(
            (ROOT / "branding" / "initial_preferences.json").read_text())
        cls.tmp = Path(tempfile.mkdtemp(prefix="sunshine-customize-"))
        cls.written = customize.generate(cls.config, cls.tmp, cls.base_prefs)

    def read_json(self, name):
        return json.loads((self.tmp / name).read_text())

    def test_initial_preferences(self):
        prefs = self.read_json("initial_preferences.json")
        self.assertEqual(prefs["homepage"],
                         self.config["startup"]["homepage"])
        self.assertTrue(prefs["browser"]["show_home_button"])
        self.assertTrue(prefs["enable_do_not_track"])
        self.assertEqual(prefs["session"]["restore_on_startup"], 5)
        # Les réglages de base (distribution) sont conservés.
        self.assertIn("distribution", prefs)
        self.assertTrue(
            prefs["distribution"]["suppress_first_run_default_browser_prompt"])

    def test_bookmarks_wired_into_preferences(self):
        prefs = self.read_json("initial_preferences.json")
        self.assertTrue(prefs["distribution"]["import_bookmarks"])
        self.assertEqual(prefs["distribution"]["import_bookmarks_from_file"],
                         "/opt/sunshine-browser/initial_bookmarks.html")
        html = (self.tmp / "initial_bookmarks.html").read_text()
        for item in self.config["bookmarks"]["items"]:
            self.assertIn(item["url"], html)
            self.assertIn(item["name"], html)
        self.assertIn("PERSONAL_TOOLBAR_FOLDER", html)

    def test_theme_manifest(self):
        manifest = self.read_json("theme/manifest.json")
        self.assertEqual(manifest["manifest_version"], 3)
        self.assertEqual(manifest["version"], customize.sunshine_version())
        colors = manifest["theme"]["colors"]
        self.assertEqual(colors["frame"], [232, 162, 60])
        self.assertEqual(colors["ntp_background"], [255, 248, 238])
        self.assertEqual(colors["button_background"], [232, 162, 60])
        # Pas de fond d'écran configuré -> pas de section images.
        self.assertNotIn("images", manifest["theme"])

    def test_policies(self):
        policies = self.read_json("policies.json")
        self.assertFalse(policies["MetricsReportingEnabled"])
        self.assertTrue(policies["BraveRewardsDisabled"])
        self.assertTrue(policies["BraveWalletDisabled"])
        self.assertFalse(policies["TorDisabled"])

    def test_flags(self):
        flags = (self.tmp / "flags.conf").read_text()
        self.assertTrue(flags.startswith("#"))
        # Aucun drapeau actif dans la config par défaut.
        active = [l for l in flags.splitlines()
                  if l.strip() and not l.startswith("#")]
        self.assertEqual(active, [])

    def test_all_outputs_written(self):
        names = {p.name for p in self.written}
        self.assertEqual(names, {"initial_preferences.json",
                                 "initial_bookmarks.html",
                                 "manifest.json", "policies.json",
                                 "flags.conf"})


class TestGenerationVariants(unittest.TestCase):
    """Comportements conditionnels (sans favoris, avec session, fond d'écran)."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="sunshine-customize-"))
        self.base = {"distribution": {"make_chrome_default": False}}

    def test_no_bookmarks(self):
        config = {"startup": {"homepage": "https://example.org",
                              "restore_session": True}}
        customize.generate(config, self.tmp, self.base)
        prefs = json.loads((self.tmp / "initial_preferences.json").read_text())
        self.assertFalse((self.tmp / "initial_bookmarks.html").exists())
        self.assertNotIn("import_bookmarks_from_file", prefs["distribution"])
        self.assertEqual(prefs["session"]["restore_on_startup"], 1)

    def test_custom_flags(self):
        config = {"flags": {"switches": ["--force-dark-mode"]}}
        customize.generate(config, self.tmp, self.base)
        flags = (self.tmp / "flags.conf").read_text()
        self.assertIn("--force-dark-mode", flags)

    def test_wallpaper_copied_and_referenced(self):
        wallpaper = self.tmp / "wall.png"
        wallpaper.write_bytes(b"PNG")
        config = {"appearance": {"frame": "#112233",
                                 "ntp_wallpaper": str(wallpaper)}}
        customize.generate(config, self.tmp / "out", self.base)
        manifest = json.loads(
            (self.tmp / "out" / "theme" / "manifest.json").read_text())
        self.assertEqual(manifest["theme"]["images"]["theme_ntp_background"],
                         "ntp_background.png")
        self.assertEqual(
            (self.tmp / "out" / "theme" / "ntp_background.png").read_bytes(),
            b"PNG")


if __name__ == "__main__":
    unittest.main()
