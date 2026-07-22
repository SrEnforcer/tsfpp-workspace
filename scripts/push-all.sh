#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

git submodule foreach --recursive '
  branch=$(git branch --show-current)
  if [ -z "$branch" ]; then
    printf "Skipping %s: detached HEAD\n" "$path"
    exit 0
  fi
  if [ -n "$(git status --short)" ]; then
    printf "Pushing %s [%s]\n" "$path" "$branch"
    git push origin "$branch"
  else
    printf "Skipping %s: clean\n" "$path"
  fi
'
