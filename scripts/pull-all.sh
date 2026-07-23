#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

. "$repo_root/scripts/subtree-repos.sh"

if [ -n "$(git status --short)" ]; then
  printf "Commit or stash the root workspace before pulling subtree changes.\n" >&2
  exit 1
fi

export GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_tsfpp -o IdentitiesOnly=yes'

branch="$(git branch --show-current)"

for repo_name in "${subtree_repos[@]}"; do
  repo_path="repos/$repo_name"
  remote="$(subtree_remote_for "$repo_name")"
  printf "Pulling %s [%s]\n" "$repo_path" "$branch"
  git subtree pull --squash --prefix="$repo_path" "$remote" main
done