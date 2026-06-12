#!/usr/bin/env bash
# Construit les paquets Linux de Sunshine à partir d'un build terminé :
#   - dist/sunshine-browser_<version>_<arch>.deb
#   - dist/sunshine-browser-<version>-linux-<arch>.tar.gz (archive portable)
#
# Usage :
#   ./scripts/package_linux.sh [chemin/vers/out/Release]
#
# Par défaut : build/brave-browser/src/out/Release (produit par `make build`).
# Le binaire `brave` y est installé sous /opt/sunshine-browser/ et exposé
# en /usr/bin/sunshine-browser, avec lanceur .desktop, icônes et
# initial_preferences.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-${ROOT}/build/brave-browser/src/out/Release}"
DIST="${ROOT}/dist"
ARCH="$(dpkg --print-architecture 2>/dev/null || echo amd64)"

# shellcheck disable=SC1091
source <(grep -E '^[A-Z_]+=' "${ROOT}/VERSION")
# BRANDING contient des valeurs avec espaces : lecture clé par clé.
branding() { grep -E "^$1=" "${ROOT}/branding/BRANDING" | cut -d= -f2-; }
LINUX_PACKAGE="$(branding LINUX_PACKAGE)"
COMPANY_NAME="$(branding COMPANY_NAME)"
HOMEPAGE="$(branding HOMEPAGE)"

PKG="${LINUX_PACKAGE}"                  # sunshine-browser
INSTALL_DIR="opt/${PKG}"

if [[ ! -x "${OUT_DIR}/brave" ]]; then
  echo "Erreur : binaire introuvable (${OUT_DIR}/brave)." >&2
  echo "Compiler d'abord avec \`make build\`, ou passer le dossier out en argument." >&2
  exit 1
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT
chmod 755 "${STAGE}"
mkdir -p "${DIST}" \
         "${STAGE}/${INSTALL_DIR}" \
         "${STAGE}/usr/bin" \
         "${STAGE}/usr/share/applications" \
         "${STAGE}/DEBIAN"

echo "==> Copie des fichiers du build (${OUT_DIR})…"
# Binaire principal, renommé.
install -m 755 "${OUT_DIR}/brave" "${STAGE}/${INSTALL_DIR}/${PKG}"
# Fichiers d'exécution Chromium, copiés s'ils existent.
RUNTIME_ITEMS=(
  chrome_100_percent.pak chrome_200_percent.pak resources.pak
  icudtl.dat v8_context_snapshot.bin snapshot_blob.bin
  chrome_crashpad_handler chrome-sandbox
  libEGL.so libGLESv2.so libvk_swiftshader.so libvulkan.so.1
  vk_swiftshader_icd.json locales resources swiftshader MEIPreload
)
for item in "${RUNTIME_ITEMS[@]}"; do
  if [[ -e "${OUT_DIR}/${item}" ]]; then
    cp -a "${OUT_DIR}/${item}" "${STAGE}/${INSTALL_DIR}/"
  fi
done
# Le sandbox SUID doit appartenir à root avec le bit setuid.
if [[ -e "${STAGE}/${INSTALL_DIR}/chrome-sandbox" ]]; then
  chmod 4755 "${STAGE}/${INSTALL_DIR}/chrome-sandbox"
fi

echo "==> Branding et intégration bureau…"
# Personnalisation : artefacts générés par `make customize` si présents,
# sinon les valeurs de base du branding.
GEN="${ROOT}/customize/generated"
if [[ -f "${GEN}/initial_preferences.json" ]]; then
  install -m 644 "${GEN}/initial_preferences.json" \
    "${STAGE}/${INSTALL_DIR}/initial_preferences"
else
  echo "/!\\ customize/generated absent (lancer make customize) : préférences de base"
  install -m 644 "${ROOT}/branding/initial_preferences.json" \
    "${STAGE}/${INSTALL_DIR}/initial_preferences"
fi
if [[ -f "${GEN}/initial_bookmarks.html" ]]; then
  install -m 644 "${GEN}/initial_bookmarks.html" \
    "${STAGE}/${INSTALL_DIR}/initial_bookmarks.html"
fi
if [[ -d "${GEN}/theme" ]]; then
  mkdir -p "${STAGE}/${INSTALL_DIR}/extensions"
  cp -a "${GEN}/theme" "${STAGE}/${INSTALL_DIR}/extensions/sunshine-theme"
fi
# Extensions intégrées du dépôt (Sunshine Assistant…).
if [[ -d "${ROOT}/extensions" ]]; then
  mkdir -p "${STAGE}/${INSTALL_DIR}/extensions"
  cp -a "${ROOT}/extensions/." "${STAGE}/${INSTALL_DIR}/extensions/"
fi
if [[ -f "${GEN}/policies.json" ]]; then
  mkdir -p "${STAGE}/etc/${PKG}/policies/managed"
  install -m 644 "${GEN}/policies.json" \
    "${STAGE}/etc/${PKG}/policies/managed/sunshine.json"
fi
mkdir -p "${STAGE}/etc/${PKG}"
if [[ -f "${GEN}/flags.conf" ]]; then
  install -m 644 "${GEN}/flags.conf" "${STAGE}/etc/${PKG}/flags.conf"
fi

install -m 644 "${ROOT}/branding/linux/${PKG}.desktop" \
  "${STAGE}/usr/share/applications/${PKG}.desktop"

# Lanceur : applique les drapeaux de /etc/<pkg>/flags.conf puis exec le binaire.
cat > "${STAGE}/usr/bin/${PKG}" <<EOF
#!/bin/sh
# Lanceur Sunshine — drapeaux configurables dans /etc/${PKG}/flags.conf
FLAGS=""
if [ -r "/etc/${PKG}/flags.conf" ]; then
  FLAGS="\$(grep -v '^[[:space:]]*#' "/etc/${PKG}/flags.conf" | tr '\\n' ' ')"
fi
# shellcheck disable=SC2086
exec "/${INSTALL_DIR}/${PKG}" \${FLAGS} "\$@"
EOF
chmod 755 "${STAGE}/usr/bin/${PKG}"

if [[ -d "${ROOT}/assets/logo/png" ]]; then
  for png in "${ROOT}"/assets/logo/png/sunshine-*.png; do
    size="$(basename "${png}" .png | grep -oE '[0-9]+')" || continue
    icon_dir="${STAGE}/usr/share/icons/hicolor/${size}x${size}/apps"
    mkdir -p "${icon_dir}"
    install -m 644 "${png}" "${icon_dir}/${PKG}.png"
  done
else
  echo "/!\\ assets/logo/png absent : paquet sans icônes (lancer make icons)"
fi

echo "==> Métadonnées du paquet…"
INSTALLED_SIZE="$(du -ks "${STAGE}" | cut -f1)"
cat > "${STAGE}/DEBIAN/control" <<EOF
Package: ${PKG}
Version: ${SUNSHINE_VERSION}
Architecture: ${ARCH}
Maintainer: ${COMPANY_NAME} <${HOMEPAGE}>
Installed-Size: ${INSTALLED_SIZE}
Depends: libc6, libnss3, libatk-bridge2.0-0, libgtk-3-0 | libgtk-4-1, libxss1, fonts-liberation, xdg-utils
Section: web
Priority: optional
Homepage: ${HOMEPAGE}
Description: Sunshine, navigateur web basé sur Brave (Chromium)
 Sunshine est un navigateur web pour PC basé sur Brave ${BRAVE_VERSION}
 (Chromium ${CHROMIUM_VERSION}), avec le branding Horizon Computers.
EOF

cat > "${STAGE}/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e
if command -v update-desktop-database >/dev/null; then
  update-desktop-database -q /usr/share/applications || true
fi
if command -v gtk-update-icon-cache >/dev/null; then
  gtk-update-icon-cache -q /usr/share/icons/hicolor || true
fi
EOF
chmod 755 "${STAGE}/DEBIAN/postinst"

DEB="${DIST}/${PKG}_${SUNSHINE_VERSION}_${ARCH}.deb"
dpkg-deb --build --root-owner-group "${STAGE}" "${DEB}" >/dev/null
echo "==> ${DEB}"

TARBALL="${DIST}/${PKG}-${SUNSHINE_VERSION}-linux-${ARCH}.tar.gz"
tar -C "${STAGE}/opt" -czf "${TARBALL}" "${PKG}"
echo "==> ${TARBALL} (archive portable)"

(cd "${DIST}" && sha256sum "$(basename "${DEB}")" "$(basename "${TARBALL}")" > SHA256SUMS.linux-"${ARCH}".txt)
echo "==> Sommes de contrôle : dist/SHA256SUMS.linux-${ARCH}.txt"
