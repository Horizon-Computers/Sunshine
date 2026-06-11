#!/usr/bin/env bash
# Vérifie que la machine est prête à compiler Sunshine (avant scripts/init.sh).
# Sortie 0 si tous les prérequis bloquants sont satisfaits.
set -uo pipefail

OK=0; KO=0; WARN=0
pass() { echo "  ✓ $1"; OK=$((OK+1)); }
fail() { echo "  ✗ $1"; KO=$((KO+1)); }
warn() { echo "  ! $1"; WARN=$((WARN+1)); }

echo "== Sunshine doctor =="

echo "Outils requis :"
for tool in git python3 npm node curl; do
  if command -v "${tool}" >/dev/null; then
    pass "${tool} ($(command -v "${tool}"))"
  else
    fail "${tool} introuvable"
  fi
done

if command -v node >/dev/null; then
  NODE_MAJOR="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
  if [[ "${NODE_MAJOR}" -ge 20 ]]; then
    pass "Node.js $(node --version) (>= 20 requis)"
  else
    fail "Node.js $(node --version) trop ancien (>= 20 requis)"
  fi
fi

echo "Outils d'icônes (au moins un requis pour generate_icons.sh) :"
if command -v rsvg-convert >/dev/null || command -v inkscape >/dev/null \
   || command -v magick >/dev/null || command -v convert >/dev/null; then
  pass "convertisseur SVG disponible"
else
  warn "aucun convertisseur SVG (installer librsvg2-bin, inkscape ou imagemagick)"
fi

echo "Ressources machine :"
DISK_GB="$(df -BG --output=avail . 2>/dev/null | tail -1 | tr -dc '0-9' || echo 0)"
if [[ "${DISK_GB}" -ge 100 ]]; then
  pass "disque libre : ${DISK_GB} Go (>= 100 Go requis)"
elif [[ "${DISK_GB}" -ge 80 ]]; then
  warn "disque libre : ${DISK_GB} Go (juste — 100 Go recommandés)"
else
  fail "disque libre : ${DISK_GB} Go (>= 100 Go requis pour les sources Chromium)"
fi

RAM_GB="$(awk '/MemTotal/ {printf "%d", $2/1024/1024}' /proc/meminfo 2>/dev/null || echo 0)"
if [[ "${RAM_GB}" -ge 16 ]]; then
  pass "RAM : ${RAM_GB} Go (>= 16 Go requis, 32 recommandés)"
elif [[ "${RAM_GB}" -ge 8 ]]; then
  warn "RAM : ${RAM_GB} Go (build possible mais très lent, 16 Go minimum conseillé)"
else
  fail "RAM : ${RAM_GB} Go (insuffisant pour compiler Chromium)"
fi

echo
echo "Résultat : ${OK} ok, ${WARN} avertissement(s), ${KO} bloquant(s)"
if [[ "${KO}" -gt 0 ]]; then
  echo "Corriger les points ✗ avant de lancer scripts/init.sh"
  exit 1
fi
echo "Machine prête : ./scripts/init.sh peut être lancé."
