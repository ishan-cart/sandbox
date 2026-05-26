#!/usr/bin/env bash
set -euo pipefail

echo 'paths<<EOF'

for f in ./apps/*; do
  if [ -d "$f" ]; then
    echo "${f##*/}: $f/**"
  fi
done

for f in ./terraform/*; do
  if [ -d "$f" ] && [ "${f##*/}" != "common-files" ]; then
    echo "terraform-${f##*/}: $f/**"
  fi
done

echo 'helm-libraries: helm-libraries/common-library/**'

echo 'EOF'
