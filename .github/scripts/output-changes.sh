#!/usr/bin/env bash
set -euo pipefail


terraform=()

for arg in "$@"; do

  if [ "${arg##-*}" == "terraform" ]; then
    terraform+=("${f##*-}")
  fi
done

json_output=$(jq -c --args "${terraform[@]}")

echo "changes<<EOF"
echo "$json_output"
echo "EOF"