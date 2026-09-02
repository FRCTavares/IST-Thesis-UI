#!/usr/bin/env bash

set +u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

BAD=0

for path in \
  tsconfig.app.tsbuildinfo \
  tsconfig.node.tsbuildinfo \
  vite.config.js \
  vite.config.d.ts \
  tailwind.config.js \
  tailwind.config.d.ts
do
  if [ -e "$path" ]; then
    printf 'ERROR: generated source-tree artifact exists: %s\n' "$path" >&2
    BAD=1
  fi
done

if [ "$BAD" -ne 0 ]; then
  exit 1
fi

printf 'Generated-artifact check PASS\n'
