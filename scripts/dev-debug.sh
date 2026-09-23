#!/bin/sh
# Variante debug do dev-run.sh (ver scripts/dev-run.sh).
npx tsc-alias -p tsconfig.build.json && node --inspect=0.0.0.0:9229 dist/main
