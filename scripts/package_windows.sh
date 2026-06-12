#!/usr/bin/env bash
# Prépare la distribution Windows de Sunshine à partir d'un build Windows
# (out/Release contenant brave.exe) :
#   - dist/sunshine-browser-<version>-windows-x64.zip   (version portable)
#   - dist/sunshine-setup.iss                           (script Inno Setup)
#
# Usage :
#   ./scripts/package_windows.sh [chemin/vers/out/Release]
#
# Le .zip est utilisable tel quel. L'installeur .exe se compile sur Windows :
#   iscc dist\sunshine-setup.iss
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-${ROOT}/build/brave-browser/src/out/Release}"
DIST="${ROOT}/dist"

# shellcheck disable=SC1091
source <(grep -E '^[A-Z_]+=' "${ROOT}/VERSION")
branding() { grep -E "^$1=" "${ROOT}/branding/BRANDING" | cut -d= -f2-; }
PRODUCT="$(branding PRODUCT_NAME)"
COMPANY="$(branding COMPANY_NAME)"
HOMEPAGE="$(branding HOMEPAGE)"
APP_ID="$(branding WIN_APP_USER_MODEL_ID)"

if [[ ! -f "${OUT_DIR}/brave.exe" ]]; then
  echo "Erreur : ${OUT_DIR}/brave.exe introuvable (build Windows requis)." >&2
  exit 1
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT
APP="${STAGE}/Sunshine"
mkdir -p "${APP}" "${DIST}"

echo "==> Copie des fichiers du build (${OUT_DIR})…"
cp "${OUT_DIR}/brave.exe" "${APP}/sunshine.exe"
# Fichiers d'exécution Chromium Windows, copiés s'ils existent.
shopt -s nullglob
for dll in "${OUT_DIR}"/*.dll; do cp "${dll}" "${APP}/"; done
shopt -u nullglob
RUNTIME_ITEMS=(
  chrome_100_percent.pak chrome_200_percent.pak resources.pak
  icudtl.dat v8_context_snapshot.bin snapshot_blob.bin
  chrome_elf.dll chrome_proxy.exe notification_helper.exe
  locales resources swiftshader MEIPreload
)
for item in "${RUNTIME_ITEMS[@]}"; do
  [[ -e "${OUT_DIR}/${item}" ]] && cp -a "${OUT_DIR}/${item}" "${APP}/"
done

echo "==> Branding et personnalisation…"
GEN="${ROOT}/customize/generated"
if [[ -f "${GEN}/initial_preferences.json" ]]; then
  cp "${GEN}/initial_preferences.json" "${APP}/initial_preferences"
else
  cp "${ROOT}/branding/initial_preferences.json" "${APP}/initial_preferences"
fi
[[ -f "${GEN}/initial_bookmarks.html" ]] && cp "${GEN}/initial_bookmarks.html" "${APP}/"
mkdir -p "${APP}/extensions"
[[ -d "${GEN}/theme" ]] && cp -a "${GEN}/theme" "${APP}/extensions/sunshine-theme"
[[ -d "${ROOT}/extensions" ]] && cp -a "${ROOT}/extensions/." "${APP}/extensions/"
[[ -f "${ROOT}/assets/logo/png/sunshine.ico" ]] && cp "${ROOT}/assets/logo/png/sunshine.ico" "${APP}/"

ZIP="${DIST}/sunshine-browser-${SUNSHINE_VERSION}-windows-x64.zip"
rm -f "${ZIP}"
(cd "${STAGE}" && zip -qr "${ZIP}" Sunshine)
echo "==> ${ZIP}"

echo "==> Génération du script Inno Setup…"
cat > "${DIST}/sunshine-setup.iss" <<EOF
; Installeur Windows de ${PRODUCT} — généré par scripts/package_windows.sh.
; Compiler sur Windows : iscc sunshine-setup.iss
; Prérequis : dézipper sunshine-browser-${SUNSHINE_VERSION}-windows-x64.zip
; à côté de ce script (dossier Sunshine\\).

[Setup]
AppId=${APP_ID}
AppName=${PRODUCT}
AppVersion=${SUNSHINE_VERSION}
AppPublisher=${COMPANY}
AppPublisherURL=${HOMEPAGE}
DefaultDirName={autopf}\\${PRODUCT}
DefaultGroupName=${PRODUCT}
UninstallDisplayIcon={app}\\sunshine.exe
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
OutputBaseFilename=sunshine-browser-${SUNSHINE_VERSION}-setup

[Files]
Source: "Sunshine\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\\${PRODUCT}"; Filename: "{app}\\sunshine.exe"
Name: "{autodesktop}\\${PRODUCT}"; Filename: "{app}\\sunshine.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Créer une icône sur le Bureau"; GroupDescription: "Icônes :"

[Registry]
; Inscription comme navigateur (Default Programs).
Root: HKLM; Subkey: "SOFTWARE\\RegisteredApplications"; ValueType: string; ValueName: "${PRODUCT}"; ValueData: "Software\\${PRODUCT}\\Capabilities"; Flags: uninsdeletevalue
Root: HKLM; Subkey: "Software\\${PRODUCT}\\Capabilities"; ValueType: string; ValueName: "ApplicationName"; ValueData: "${PRODUCT}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\\${PRODUCT}\\Capabilities\\URLAssociations"; ValueType: string; ValueName: "http"; ValueData: "SunshineHTML"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\\${PRODUCT}\\Capabilities\\URLAssociations"; ValueType: string; ValueName: "https"; ValueData: "SunshineHTML"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\\Classes\\SunshineHTML"; ValueType: string; ValueData: "Document HTML ${PRODUCT}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\\Classes\\SunshineHTML\\shell\\open\\command"; ValueType: string; ValueData: """{app}\\sunshine.exe"" ""%1"""; Flags: uninsdeletekey

[Run]
Filename: "{app}\\sunshine.exe"; Description: "Lancer ${PRODUCT}"; Flags: nowait postinstall skipifsilent
EOF
echo "==> ${DIST}/sunshine-setup.iss"

(cd "${DIST}" && sha256sum "$(basename "${ZIP}")" > "SHA256SUMS.windows-x64.txt")
echo "==> Sommes de contrôle : dist/SHA256SUMS.windows-x64.txt"
