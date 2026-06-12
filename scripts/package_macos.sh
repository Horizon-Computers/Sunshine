#!/usr/bin/env bash
# Construit le DMG macOS de Sunshine à partir d'un build mac terminé.
#
# Usage (sur macOS uniquement) :
#   ./scripts/package_macos.sh [chemin/vers/out/Release]
#
# Étapes : copie du .app produit par le build → Sunshine.app, icône
# sunshine.icns, nom affiché dans Info.plist, personnalisation embarquée
# (initial_preferences, extensions), re-signature ad hoc, DMG avec lien
# /Applications, somme SHA-256.
#
# NOTE : script non exécuté en CI (nécessite macOS). Le renommage reste
# superficiel tant que le patch brave-core de rebranding profond n'est pas
# appliqué ; pour une distribution publique, signer avec un certificat
# Developer ID et notariser (voir docs/DISTRIBUTION.md).
set -euo pipefail

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Erreur : ce script nécessite macOS (hdiutil, codesign, PlistBuddy)." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-${ROOT}/build/brave-browser/src/out/Release}"
DIST="${ROOT}/dist"

# shellcheck disable=SC1091
source <(grep -E '^[A-Z_]+=' "${ROOT}/VERSION")

APP_SRC="$(find "${OUT_DIR}" -maxdepth 1 -name "*.app" -print -quit)"
if [[ -z "${APP_SRC}" ]]; then
  echo "Erreur : aucun .app dans ${OUT_DIR} (build macOS requis)." >&2
  exit 1
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT
APP="${STAGE}/Sunshine.app"
mkdir -p "${DIST}"

echo "==> Copie de $(basename "${APP_SRC}") → Sunshine.app…"
ditto "${APP_SRC}" "${APP}"

PLIST="${APP}/Contents/Info.plist"
PB="/usr/libexec/PlistBuddy"
echo "==> Nom affiché et icône…"
"${PB}" -c "Set :CFBundleName Sunshine" "${PLIST}" 2>/dev/null \
  || "${PB}" -c "Add :CFBundleName string Sunshine" "${PLIST}"
"${PB}" -c "Set :CFBundleDisplayName Sunshine" "${PLIST}" 2>/dev/null \
  || "${PB}" -c "Add :CFBundleDisplayName string Sunshine" "${PLIST}"

if [[ -f "${ROOT}/assets/logo/png/sunshine.icns" ]]; then
  ICON_NAME="$("${PB}" -c "Print :CFBundleIconFile" "${PLIST}" 2>/dev/null || echo app.icns)"
  [[ "${ICON_NAME}" == *.icns ]] || ICON_NAME="${ICON_NAME}.icns"
  cp "${ROOT}/assets/logo/png/sunshine.icns" \
     "${APP}/Contents/Resources/${ICON_NAME}"
else
  echo "/!\\ sunshine.icns absent (make icons sur une machine avec les outils)"
fi

echo "==> Personnalisation embarquée…"
GEN="${ROOT}/customize/generated"
RES="${APP}/Contents/Resources"
if [[ -f "${GEN}/initial_preferences.json" ]]; then
  cp "${GEN}/initial_preferences.json" "${RES}/initial_preferences"
else
  cp "${ROOT}/branding/initial_preferences.json" "${RES}/initial_preferences"
fi
mkdir -p "${RES}/extensions"
[[ -d "${GEN}/theme" ]] && cp -R "${GEN}/theme" "${RES}/extensions/sunshine-theme"
[[ -d "${ROOT}/extensions" ]] && cp -R "${ROOT}/extensions/." "${RES}/extensions/"

echo "==> Re-signature ad hoc (les modifications invalident la signature du build)…"
codesign --force --deep --sign - "${APP}"

echo "==> Création du DMG…"
ln -s /Applications "${STAGE}/Applications"
DMG="${DIST}/sunshine-browser-${SUNSHINE_VERSION}-macos.dmg"
rm -f "${DMG}"
hdiutil create -volname "Sunshine ${SUNSHINE_VERSION}" -srcfolder "${STAGE}" \
  -ov -format UDZO "${DMG}" >/dev/null
echo "==> ${DMG}"

(cd "${DIST}" && shasum -a 256 "$(basename "${DMG}")" > SHA256SUMS.macos.txt)
echo "==> Sommes de contrôle : dist/SHA256SUMS.macos.txt"
