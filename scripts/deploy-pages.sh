#!/bin/sh
# Rebuild and push dist/ to gh-pages as a new commit (no force push).
set -e
cd "$(dirname "$0")/.."
npm test && node scripts/build.mjs
D=$(mktemp -d); git clone -q --branch gh-pages --depth 1 "$(git remote get-url origin)" "$D"
find "$D" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "$D"; N=$(git config user.name); E=$(git config user.email); cd "$D"; git config user.name "$N"; git config user.email "$E"; git add -A; git commit -qm "Deploy $(date -u +%FT%TZ)" && git push -q origin gh-pages
