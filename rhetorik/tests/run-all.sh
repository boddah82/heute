#!/bin/sh
# Alle Browser-Tests der Rhetorik-App. Server auf der Repo-Wurzel (die App lädt das SDK aus ../lernen/vendor).
cd "$(dirname "$0")/../.." || exit 1
python3 -m http.server 8766 >/dev/null 2>&1 &
SRV=$!
sleep 1
for t in rhetorik/tests/[0-9]*.js; do
  echo "== $t"
  node "$t" 2>&1 | tail -n 40
done
kill $SRV
