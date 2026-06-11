#!/usr/bin/env bash
# Récupère brave-browser (dépôt meta de Brave) à la version épinglée dans
# VERSION, installe les dépendances npm et lance `npm run init`, qui télécharge
# brave-core et les sources Chromium (~70 Go, prévoir du temps et du disque).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT}/build"

# shellcheck disable=SC1091
source <(grep -E '^[A-Z_]+=' "${ROOT}/VERSION")

echo "==> Sunshine ${SUNSHINE_VERSION} — basé sur Brave ${BRAVE_VERSION} (Chromium ${CHROMIUM_VERSION})"

mkdir -p "${BUILD_DIR}"
if [[ ! -d "${BUILD_DIR}/brave-browser" ]]; then
  echo "==> Clonage de brave/brave-browser v${BRAVE_VERSION}…"
  git clone --branch "v${BRAVE_VERSION}" --depth 1 \
    https://github.com/brave/brave-browser.git "${BUILD_DIR}/brave-browser"
else
  echo "==> build/brave-browser existe déjà, mise à jour vers v${BRAVE_VERSION}…"
  git -C "${BUILD_DIR}/brave-browser" fetch --depth 1 origin "tag" "v${BRAVE_VERSION}"
  git -C "${BUILD_DIR}/brave-browser" checkout "v${BRAVE_VERSION}"
fi

cd "${BUILD_DIR}/brave-browser"
echo "==> npm install…"
npm install

echo "==> npm run init (téléchargement de brave-core + Chromium, long)…"
npm run init

echo "==> Sources prêtes dans ${BUILD_DIR}/brave-browser/src"
echo "==> Étape suivante : python3 scripts/apply_branding.py build/brave-browser/src/brave"
