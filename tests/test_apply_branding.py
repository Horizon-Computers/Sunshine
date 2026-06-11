#!/usr/bin/env python3
"""Tests unitaires de scripts/apply_branding.py.

Lancement :  python3 -m unittest discover -s tests -v
"""

import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import apply_branding  # noqa: E402


def rebrand_text(text: str, product: str = "Sunshine") -> str:
    for pattern, repl in apply_branding.display_name_replacements(product):
        text = pattern.sub(repl, text)
    return text


class TestDisplayNameReplacements(unittest.TestCase):
    """Le nom affiché change, les identifiants techniques restent intacts."""

    def test_product_name_simple(self):
        self.assertEqual(rebrand_text("Welcome to Brave!"), "Welcome to Sunshine!")

    def test_product_name_with_browser_suffix(self):
        self.assertEqual(rebrand_text("Brave Browser is fast"),
                         "Sunshine Browser is fast")

    def test_internal_url_scheme_untouched(self):
        self.assertEqual(rebrand_text("Open brave://settings"),
                         "Open brave://settings")

    def test_domain_untouched(self):
        self.assertEqual(rebrand_text("Visit https://brave.com for details"),
                         "Visit https://brave.com for details")

    def test_company_identifier_untouched(self):
        self.assertEqual(rebrand_text("Profile under BraveSoftware/Brave-Browser"),
                         "Profile under BraveSoftware/Brave-Browser")

    def test_snake_case_identifier_untouched(self):
        self.assertEqual(rebrand_text("see brave_strings.grd and IDS_BRAVE"),
                         "see brave_strings.grd and IDS_BRAVE")

    def test_mixed_sentence(self):
        out = rebrand_text("Brave protects you. Brave Browser syncs via brave://sync")
        self.assertEqual(out,
                         "Sunshine protects you. Sunshine Browser syncs via brave://sync")


class TestLoadBranding(unittest.TestCase):
    def test_required_keys_present(self):
        branding = apply_branding.load_branding()
        for key in ("PRODUCT_NAME", "PRODUCT_NAME_LOWER", "COMPANY_NAME",
                    "MAC_BUNDLE_ID", "LINUX_PACKAGE", "PRIMARY_COLOR"):
            self.assertIn(key, branding)
        self.assertEqual(branding["PRODUCT_NAME"], "Sunshine")

    def test_comments_ignored(self):
        branding = apply_branding.load_branding()
        for key in branding:
            self.assertFalse(key.startswith("#"))


class FakeCheckout(unittest.TestCase):
    """Base : fabrique un faux checkout brave-core dans un dossier temporaire."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="sunshine-test-"))
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.checkout = self.tmp / "brave"
        (self.checkout / "app" / "theme" / "brave" / "default_100_percent").mkdir(
            parents=True)
        (self.checkout / "package.json").write_text("{}")
        self.grd = self.checkout / "app" / "brave_strings.grd"
        self.grd.write_text(
            '<message name="IDS_HELLO">Welcome to Brave Browser</message>\n')


class TestRebrandStrings(FakeCheckout):
    def test_rewrites_grd(self):
        changed = apply_branding.rebrand_strings(self.checkout, "Sunshine",
                                                 dry_run=False)
        self.assertEqual(changed, 1)
        self.assertIn("Sunshine Browser", self.grd.read_text())

    def test_dry_run_leaves_files_untouched(self):
        before = self.grd.read_text()
        changed = apply_branding.rebrand_strings(self.checkout, "Sunshine",
                                                 dry_run=True)
        self.assertEqual(changed, 1)
        self.assertEqual(self.grd.read_text(), before)

    def test_idempotent(self):
        apply_branding.rebrand_strings(self.checkout, "Sunshine", dry_run=False)
        changed_again = apply_branding.rebrand_strings(self.checkout, "Sunshine",
                                                       dry_run=False)
        self.assertEqual(changed_again, 0)


class TestReplaceIcons(FakeCheckout):
    def setUp(self):
        super().setUp()
        self.png_dir = self.tmp / "png"
        self.png_dir.mkdir()
        (self.png_dir / "sunshine-16.png").write_bytes(b"NEW")
        (self.png_dir / "sunshine.ico").write_bytes(b"NEWICO")
        theme = self.checkout / "app" / "theme" / "brave" / "default_100_percent"
        (theme / "product_logo_16.png").write_bytes(b"OLD")
        (self.checkout / "app" / "win").mkdir()
        (self.checkout / "app" / "win" / "brave.ico").write_bytes(b"OLDICO")

    def test_replaces_matching_sizes_and_ico(self):
        replaced = apply_branding.replace_icons(self.checkout, dry_run=False,
                                                png_dir=self.png_dir)
        self.assertEqual(replaced, 2)
        theme = self.checkout / "app" / "theme" / "brave" / "default_100_percent"
        self.assertEqual((theme / "product_logo_16.png").read_bytes(), b"NEW")
        self.assertEqual(
            (self.checkout / "app" / "win" / "brave.ico").read_bytes(), b"NEWICO")

    def test_dry_run_counts_without_writing(self):
        replaced = apply_branding.replace_icons(self.checkout, dry_run=True,
                                                png_dir=self.png_dir)
        self.assertEqual(replaced, 2)
        theme = self.checkout / "app" / "theme" / "brave" / "default_100_percent"
        self.assertEqual((theme / "product_logo_16.png").read_bytes(), b"OLD")

    def test_missing_png_dir_is_not_fatal(self):
        replaced = apply_branding.replace_icons(self.checkout, dry_run=False,
                                                png_dir=self.tmp / "absent")
        self.assertEqual(replaced, 0)


if __name__ == "__main__":
    unittest.main()
