#!/usr/bin/env bash
set -euo pipefail


terraform=()

echo $1 | jq -c '.{}' | while read -r f; do
  if [ "${f##-*}" == "terraform" ]; then
    terraform+=("${f##*-}")
done

json_output=$(jq -c --args "${terraform[@]}")

echo "changes<<EOF"
echo "$json_output"
echo "EOF"