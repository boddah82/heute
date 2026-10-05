#!/bin/sh
# Alle Browser-Tests gegen einen lokalen Server ausführen.
# Voraussetzung: Node + Playwright (npm i -g playwright && npx playwright install chromium),
# ggf. PW=<Pfad zum playwright-Modul> setzen. Claude-/GitHub-API werden in den Tests nachgebaut (keine Kosten).
cd "$(dirname "$0")/.." || exit 1
python3 -m http.server 8765 >/dev/null 2>&1 &
SRV=$!
sleep 1
for t in tests/[0-9]*.js; do
  echo "== $t"
  node "$t" 2>&1 | tail -n 15
done
kill $SRV
