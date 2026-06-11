#!/usr/bin/env bash
# Met à jour la version de Brave épinglée dans VERSION.
#
#   ./scripts/update_upstream.sh           # dernière release Brave (via GitHub)
#   ./scripts/update_upstream.sh 1.92.50   # version explicite
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="${ROOT}/VERSION"

# shellcheck disable=SC1091
source <(grep -E '^[A-Z_]+=' "${VERSION_FILE}")

if [[ $# -ge 1 ]]; then
  NEW_BRAVE="$1"
  NEW_CHROMIUM=""
else
  echo "==> Recherche de la dernière release Brave…"
  JSON="$(curl -fsSL https://api.github.com/repos/brave/brave-browser/releases/latest)"
  NEW_BRAVE="$(printf '%s' "${JSON}" | grep -oE '"tag_name": *"v[0-9.]+"' | grep -oE '[0-9.]+')"
  NEW_CHROMIUM="$(printf '%s' "${JSON}" | grep -oE 'Chromium to [0-9.]+' | head -1 | grep -oE '[0-9.]+' || true)"
fi

if [[ -z "${NEW_BRAVE}" ]]; then
  echo "Erreur : impossible de déterminer la version Brave" >&2
  exit 1
fi

if [[ "${NEW_BRAVE}" == "${BRAVE_VERSION}" ]]; then
  echo "==> Déjà à jour (Brave ${BRAVE_VERSION})"
  exit 0
fi

echo "==> Brave ${BRAVE_VERSION} -> ${NEW_BRAVE}"
sed -i.bak -E "s/^BRAVE_VERSION=.*/BRAVE_VERSION=${NEW_BRAVE}/" "${VERSION_FILE}"
if [[ -n "${NEW_CHROMIUM}" ]]; then
  echo "==> Chromium ${CHROMIUM_VERSION} -> ${NEW_CHROMIUM}"
  sed -i.bak -E "s/^CHROMIUM_VERSION=.*/CHROMIUM_VERSION=${NEW_CHROMIUM}/" "${VERSION_FILE}"
fi
rm -f "${VERSION_FILE}.bak"

echo "==> VERSION mis à jour. Pense à bumper SUNSHINE_VERSION et à tagger pour publier une release."
