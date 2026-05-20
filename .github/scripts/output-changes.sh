#!/usr/bin/env bash
set -euo pipefail


terraform=()

for arg in "$@"; do
  if [[ "$arg" == terraform* ]]; then
    terraform+=("${arg#*-}")
  fi
done

json_output=$(jq -n '$ARGS.positional' -c --args "${terraform[@]}")

echo "changes<<EOF"
echo "$json_output"
echo "EOF"