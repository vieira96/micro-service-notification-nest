#!/bin/sh
# Passo único (sem espaços) para o --onSuccess do tsc-watch,
# que não interpreta shell: reescreve os aliases e sobe a API.
npx tsc-alias -p tsconfig.build.json && node dist/main
