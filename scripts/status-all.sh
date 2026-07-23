#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

. "$repo_root/scripts/subtree-repos.sh"

branch="$(git branch --show-current)"

for repo_name in "${subtree_repos[@]}"; do
  repo_path="repos/$repo_name"
  status="$(git status --short -- "$repo_path")"
  if [ -n "$status" ]; then
    printf "%s [%s]\n%s\n\n" "$repo_path" "$branch" "$status"
  else
    printf "%s [%s] clean\n" "$repo_path" "$branch"
  fi
done
