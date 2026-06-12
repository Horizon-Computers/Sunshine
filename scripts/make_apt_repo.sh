#!/usr/bin/env bash
# Construit (ou met à jour) le dépôt APT de Sunshine à partir des .deb de
# dist/. Le dépôt est généré dans apt/ — prêt à être publié tel quel
# (GitHub Pages, serveur web…).
#
# Usage :
#   ./scripts/make_apt_repo.sh [dossier/contenant/les/deb]   # défaut : dist/
#
# Signature (recommandée) : exporter SUNSHINE_GPG_KEY=<id de clé> pour
# produire Release.gpg + InRelease et publier la clé publique.
# Sans clé, le dépôt s'utilise avec [trusted=yes].
#
# Côté utilisateur :
#   echo "deb [trusted=yes] https://horizon-computers.github.io/Sunshine/apt stable main" \
#     | sudo tee /etc/apt/sources.list.d/sunshine.list
#   sudo apt update && sudo apt install sunshine-browser
# Les mises à jour arrivent ensuite via apt upgrade, comme pour Brave.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEB_SRC="${1:-${ROOT}/dist}"
REPO="${ROOT}/apt"
DIST_NAME="stable"
COMPONENT="main"
ARCH="amd64"

shopt -s nullglob
DEBS=("${DEB_SRC}"/*.deb)
shopt -u nullglob
if [[ ${#DEBS[@]} -eq 0 ]]; then
  echo "Erreur : aucun .deb dans ${DEB_SRC} (lancer make package d'abord)" >&2
  exit 1
fi

POOL="${REPO}/pool/${COMPONENT}"
BINDIR="${REPO}/dists/${DIST_NAME}/${COMPONENT}/binary-${ARCH}"
mkdir -p "${POOL}" "${BINDIR}"

echo "==> Ajout de ${#DEBS[@]} paquet(s) au pool…"
for deb in "${DEBS[@]}"; do
  cp -f "${deb}" "${POOL}/"
  echo "    $(basename "${deb}")"
done

echo "==> Index Packages…"
(cd "${REPO}" && dpkg-scanpackages --arch "${ARCH}" "pool/${COMPONENT}" \
  > "dists/${DIST_NAME}/${COMPONENT}/binary-${ARCH}/Packages")
gzip -9kf "${BINDIR}/Packages"

echo "==> Fichier Release…"
RELEASE="${REPO}/dists/${DIST_NAME}/Release"
cat > "${RELEASE}" <<EOF
Origin: Sunshine Browser
Label: Sunshine
Suite: ${DIST_NAME}
Codename: ${DIST_NAME}
Architectures: ${ARCH}
Components: ${COMPONENT}
Description: Dépôt APT officiel du navigateur Sunshine
Date: $(date -Ru)
EOF
{
  echo "SHA256:"
  (cd "${REPO}/dists/${DIST_NAME}" && for f in "${COMPONENT}/binary-${ARCH}/Packages" \
                                                "${COMPONENT}/binary-${ARCH}/Packages.gz"; do
    printf ' %s %s %s\n' "$(sha256sum "${f}" | cut -d' ' -f1)" \
                          "$(stat -c%s "${f}")" "${f}"
  done)
} >> "${RELEASE}"

if [[ -n "${SUNSHINE_GPG_KEY:-}" ]]; then
  echo "==> Signature GPG (clé ${SUNSHINE_GPG_KEY})…"
  gpg --batch --yes -u "${SUNSHINE_GPG_KEY}" -abs -o "${RELEASE}.gpg" "${RELEASE}"
  gpg --batch --yes -u "${SUNSHINE_GPG_KEY}" --clearsign -o \
    "${REPO}/dists/${DIST_NAME}/InRelease" "${RELEASE}"
  gpg --export --armor "${SUNSHINE_GPG_KEY}" > "${REPO}/sunshine-archive-keyring.asc"
  echo "==> Clé publique : apt/sunshine-archive-keyring.asc"
else
  echo "/!\\ SUNSHINE_GPG_KEY non défini : dépôt non signé (usage avec [trusted=yes])"
fi

echo "==> Dépôt APT prêt dans ${REPO}/"
