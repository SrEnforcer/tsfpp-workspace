#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/workspace-ops.sh status
  ./scripts/workspace-ops.sh sync
  ./scripts/workspace-ops.sh checkpoint-sync [commit-message]

Commands:
  status
    Show root status and subtree status summary.

  sync
    Safe sync pipeline for a clean workspace:
      1) push-all
      2) pull-all
      3) push root branch

  checkpoint-sync [commit-message]
    If the root workspace is dirty, create a checkpoint commit first,
    then run the same safe sync pipeline as 'sync'.
    Default message:
      chore: workspace checkpoint before sync
EOF
}

require_clean_root() {
  if [ -n "$(git status --short)" ]; then
    printf "Root workspace is dirty. Commit or stash before running sync.\n" >&2
    printf "Hint: use './scripts/workspace-ops.sh checkpoint-sync " >&2
    printf "\"<message>\"' to auto-checkpoint first.\n" >&2
    exit 1
  fi
}

run_sync_pipeline() {
  local branch
  branch="$(git branch --show-current)"

  printf "[workspace-ops] Step 1/3: push subtree changes\n"
  ./scripts/push-all.sh

  printf "[workspace-ops] Step 2/3: pull subtree updates\n"
  ./scripts/pull-all.sh

  printf "[workspace-ops] Step 3/3: push root branch %s\n" "$branch"
  git push origin "$branch"

  printf "[workspace-ops] Done.\n"
}

command="${1:-help}"
case "$command" in
  status)
    git status --short --branch
    printf "\n"
    ./scripts/status-all.sh
    ;;
  sync)
    require_clean_root
    run_sync_pipeline
    ;;
  checkpoint-sync)
    message="${2:-chore: workspace checkpoint before sync}"
    if [ -n "$(git status --short)" ]; then
      git add -A
      git commit -m "$message"
    else
      printf "[workspace-ops] No local changes to checkpoint.\n"
    fi
    require_clean_root
    run_sync_pipeline
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    printf "Unknown command: %s\n\n" "$command" >&2
    usage >&2
    exit 1
    ;;
esac
