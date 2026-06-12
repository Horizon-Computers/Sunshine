#!/usr/bin/env bash
# Empaquette les extensions intégrées en zips installables :
#   dist/sunshine-assistant-<version>.zip
#   dist/sunshine-focus-<version>.zip
#   dist/sunshine-theme-<version>.zip   (si make customize a tourné)
#
# Ces zips sont attachés aux releases GitHub : dézippés, ils se chargent dans
# n'importe quel navigateur Chromium (brave://extensions → mode développeur),
# sans attendre les binaires Sunshine.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="${ROOT}/dist"

# shellcheck disable=SC1091
source <(grep -E '^[A-Z_]+=' "${ROOT}/VERSION")
mkdir -p "${DIST}"

SUMS=()
for dir in "${ROOT}/extensions"/*/; do
  name="$(basename "${dir}")"
  manifest="${dir}manifest.json"
  [[ -f "${manifest}" ]] || continue
  # Garde-fou : la version du manifest doit suivre celle de Sunshine.
  if ! grep -q "\"version\": \"${SUNSHINE_VERSION}\"" "${manifest}"; then
    echo "Erreur : ${name}/manifest.json n'est pas en ${SUNSHINE_VERSION}" \
         "(lancer scripts/bump_version.sh)" >&2
    exit 1
  fi
  zipfile="${DIST}/${name}-${SUNSHINE_VERSION}.zip"
  rm -f "${zipfile}"
  (cd "${dir}" && zip -qr "${zipfile}" .)
  echo "==> ${zipfile}"
  SUMS+=("$(basename "${zipfile}")")
done

if [[ -d "${ROOT}/customize/generated/theme" ]]; then
  zipfile="${DIST}/sunshine-theme-${SUNSHINE_VERSION}.zip"
  rm -f "${zipfile}"
  (cd "${ROOT}/customize/generated/theme" && zip -qr "${zipfile}" .)
  echo "==> ${zipfile}"
  SUMS+=("$(basename "${zipfile}")")
else
  echo "/!\\ customize/generated/theme absent (make customize) : thème non empaqueté"
fi

(cd "${DIST}" && sha256sum "${SUMS[@]}" > SHA256SUMS.extensions.txt)
echo "==> Sommes de contrôle : dist/SHA256SUMS.extensions.txt"
