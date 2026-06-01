#!/usr/bin/env bash
set -euo pipefail

terraform=()
lambda=()

for arg in "$@"; do
	if [[ "$arg" == terraform-* ]]; then
		terraform+=("${arg#*-}")
	elif [[ "$arg" == lambda-* ]]; then
		lambda+=("${arg#*-}")
	fi
done

terraform_changes=$(jq -n '$ARGS.positional' -c --args "${terraform[@]}")
lambda_changes=$(jq -n '$ARGS.positional' -c --args "${lambda[@]}")

echo "terraform<<EOF"
echo "$terraform_changes"
echo "EOF"

echo "lambda<<EOF"
echo "$lambda_changes"
echo "EOF"
