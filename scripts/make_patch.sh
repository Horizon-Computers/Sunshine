#!/usr/bin/env bash
# Exporte les modifications locales du checkout brave-core en patch versionné.
#
#   ./scripts/make_patch.sh 001-nom-descriptif
#
# Le patch est écrit dans patches/001-nom-descriptif.patch puis appliqué
# automatiquement par scripts/apply_branding.py aux prochains checkouts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRAVE_CORE="${ROOT}/build/brave-browser/src/brave"

if [[ $# -ne 1 ]]; then
  echo "Usage : $0 NNN-description (ex. 001-nouvel-onglet)" >&2
  exit 1
fi
if [[ ! -d "${BRAVE_CORE}/.git" && ! -f "${BRAVE_CORE}/.git" ]]; then
  echo "Erreur : checkout brave-core introuvable (${BRAVE_CORE}) — lancer scripts/init.sh" >&2
  exit 1
fi

DEST="${ROOT}/patches/$1.patch"
git -C "${BRAVE_CORE}" diff > "${DEST}"

if [[ ! -s "${DEST}" ]]; then
  rm -f "${DEST}"
  echo "==> Aucune modification dans ${BRAVE_CORE}, patch non créé"
  exit 1
fi
echo "==> Patch créé : ${DEST} ($(grep -c '^diff --git' "${DEST}") fichier(s))"
