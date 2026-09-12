#!/usr/bin/env bash
# Bereitet den Next.js-Static-Export (out/) für das Hosting als Artifact vor:
# - benennt "_next" in "next-static" um (Artifact reserviert führende "_")
# - macht alle Asset-Pfade relativ (kein führendes "/")
# - entfernt das Legacy-noModule-Polyfill-Skript (nicht UTF-8-sauber, für
#   moderne Browser ohnehin ungenutzt)
set -euo pipefail
cd "$(dirname "$0")/../out"

if [ -d "_next" ]; then
  mv _next next-static
fi

grep -rlZ '' --include='*.html' --include='*.js' --include='*.css' --include='*.webmanifest' . | xargs -0 sed -i \
  -e 's#"/_next/#"next-static/#g' \
  -e "s#'/_next/#'next-static/#g" \
  -e 's#_next/#next-static/#g' \
  -e 's#"/favicon.ico#"favicon.ico#g' \
  -e 's#"/icon.svg#"icon.svg#g' \
  -e 's#"/manifest.webmanifest#"manifest.webmanifest#g'

# Legacy noModule-Polyfill-Skript entfernen (Dateiname variiert pro Build)
legacy_script=$(grep -oE '<script src="next-static/static/chunks/[a-zA-Z0-9_.-]+\.js" noModule=""></script>' index.html || true)
if [ -n "$legacy_script" ]; then
  legacy_file=$(echo "$legacy_script" | grep -oE 'next-static/static/chunks/[a-zA-Z0-9_.-]+\.js')
  sed -i "s#${legacy_script}##" index.html
  rm -f "$legacy_file"
  echo "Entfernt: $legacy_file"
fi

echo "out/ ist bereit zum Veröffentlichen (index.html als file_path, restliche Dateien als files-Map)."
