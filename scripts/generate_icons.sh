#!/usr/bin/env bash
# Génère les PNG d'icônes Sunshine à toutes les tailles depuis le SVG source.
# Nécessite rsvg-convert (librsvg), inkscape ou ImageMagick.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/assets/logo/sunshine-icon.svg"
OUT="${ROOT}/assets/logo/png"
SIZES=(16 22 24 32 48 64 128 256 512)

mkdir -p "${OUT}"

render() { # render <size> <dest>
  if command -v rsvg-convert >/dev/null; then
    rsvg-convert -w "$1" -h "$1" "${SRC}" -o "$2"
  elif command -v inkscape >/dev/null; then
    inkscape "${SRC}" -w "$1" -h "$1" -o "$2" >/dev/null 2>&1
  elif command -v magick >/dev/null; then
    magick -background none "${SRC}" -resize "$1x$1" "$2"
  elif command -v convert >/dev/null; then
    convert -background none "${SRC}" -resize "$1x$1" "$2"
  else
    echo "Erreur : installer librsvg2-bin, inkscape ou imagemagick" >&2
    exit 1
  fi
}

for size in "${SIZES[@]}"; do
  dest="${OUT}/sunshine-${size}.png"
  render "${size}" "${dest}"
  echo "==> ${dest}"
done

echo "==> Icônes générées dans ${OUT}"
