#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

git submodule foreach --recursive '
  branch=$(git branch --show-current)
  status=$(git status --short)
  if [ -z "$branch" ]; then
    branch="DETACHED"
  fi
  if [ -n "$status" ]; then
    printf "%s [%s]\n%s\n\n" "$path" "$branch" "$status"
  else
    printf "%s [%s] clean\n" "$path" "$branch"
  fi
'
