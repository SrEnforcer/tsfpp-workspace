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

has_blocker=0

for repo_name in "${subtree_repos[@]}"; do
  repo_path="repos/$repo_name"
  remote="$(subtree_remote_for "$repo_name")"
  tracking_ref="refs/remotes/subtree-preflight/$repo_name/main"

  git fetch --quiet "$remote" main:"$tracking_ref"

  local_split="$(git subtree split --prefix="$repo_path" HEAD)"
  remote_head="$(git rev-parse "$tracking_ref")"

  if [ "$local_split" = "$remote_head" ]; then
    printf "Preflight %s: in sync\n" "$repo_path"
    continue
  fi

  if git merge-base --is-ancestor "$local_split" "$remote_head"; then
    printf "Preflight %s: remote ahead (safe to pull)\n" "$repo_path"
    continue
  fi

  if git merge-base --is-ancestor "$remote_head" "$local_split"; then
    printf "Preflight %s: LOCAL AHEAD; push-all required before pull-all\n" "$repo_path" >&2
    has_blocker=1
    continue
  fi

  printf "Preflight %s: DIVERGED local and remote history; pull-all may conflict\n" "$repo_path" >&2
  has_blocker=1
done

if [ "$has_blocker" -ne 0 ]; then
  printf "Aborting pull-all due to local-ahead or diverged subtree histories.\n" >&2
  printf "Required order: run ./scripts/push-all.sh, then rerun ./scripts/pull-all.sh.\n" >&2
  exit 1
fi

for repo_name in "${subtree_repos[@]}"; do
  repo_path="repos/$repo_name"
  remote="$(subtree_remote_for "$repo_name")"
  printf "Pulling %s [%s]\n" "$repo_path" "$branch"
  git subtree pull --squash --prefix="$repo_path" "$remote" main
done