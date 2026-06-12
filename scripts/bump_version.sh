#!/usr/bin/env bash
# Bump la version de Sunshine et prépare la release.
#
#   ./scripts/bump_version.sh 1.1.0
#
# Met à jour VERSION et CHANGELOG.md, puis affiche les commandes de tag.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="${ROOT}/VERSION"
CHANGELOG="${ROOT}/CHANGELOG.md"

if [[ $# -ne 1 || ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage : $0 X.Y.Z" >&2
  exit 1
fi
NEW="$1"

# shellcheck disable=SC1091
source <(grep -E '^[A-Z_]+=' "${VERSION_FILE}")
if [[ "${NEW}" == "${SUNSHINE_VERSION}" ]]; then
  echo "Erreur : déjà en version ${NEW}" >&2
  exit 1
fi

sed -i.bak -E "s/^SUNSHINE_VERSION=.*/SUNSHINE_VERSION=${NEW}/" "${VERSION_FILE}"
rm -f "${VERSION_FILE}.bak"
echo "==> VERSION : ${SUNSHINE_VERSION} -> ${NEW}"

# Versions des extensions intégrées, alignées sur Sunshine (testé en CI).
for manifest in "${ROOT}"/extensions/*/manifest.json; do
  [[ -f "${manifest}" ]] || continue
  sed -i.bak -E "s/\"version\": \"[0-9.]+\"/\"version\": \"${NEW}\"/" "${manifest}"
  rm -f "${manifest}.bak"
  echo "==> $(basename "$(dirname "${manifest}")") : version ${NEW}"
done

TODAY="$(date +%Y-%m-%d)"
HEADER="## [${NEW}] - ${TODAY} (Brave ${BRAVE_VERSION}, Chromium ${CHROMIUM_VERSION})"
if grep -q '^## \[Unreleased\]' "${CHANGELOG}"; then
  sed -i.bak "s|^## \[Unreleased\]|## [Unreleased]\n\n${HEADER}|" "${CHANGELOG}"
  rm -f "${CHANGELOG}.bak"
  echo "==> CHANGELOG.md : section ${NEW} créée depuis [Unreleased]"
fi

cat <<EOF

Étapes suivantes :
  git add VERSION CHANGELOG.md
  git commit -m "Sunshine ${NEW} (Brave ${BRAVE_VERSION})"
  git tag v${NEW}
  git push origin HEAD v${NEW}   # déclenche le workflow de release
EOF
