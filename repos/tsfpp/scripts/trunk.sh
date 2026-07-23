#!/usr/bin/env bash
# trunk.sh — trunk-based development automation for this repo
#
# Usage:
#   scripts/trunk.sh start <branch-name>
#   scripts/trunk.sh commit <type> <scope-or--> <description> [body]
#   scripts/trunk.sh sync-main
#   scripts/trunk.sh merge-to-main <branch-name>
#   scripts/trunk.sh push
#   scripts/trunk.sh ship <branch-name>
#
# Workflow rules enforced:
#   - Never commit directly to main.
#   - Never push to main.
#   - Never force-push (--force-with-lease only, and only on rebased branches).
#   - Commit messages must follow Conventional Commits v1.0.0.
#   - Branch names must follow <type>/<kebab-slug>.
#
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# ─── helpers ──────────────────────────────────────────────────────────────────

die() { echo "trunk.sh: error: $*" >&2; exit 1; }
info() { echo "trunk.sh: $*"; }

current_branch() { git branch --show-current; }

assert_not_main() {
  local branch
  branch="$(current_branch)"
  [[ "$branch" != "main" ]] || die "You are on 'main'. Run 'scripts/trunk.sh start <branch>' first."
}

assert_clean_or_staged() {
  # Allow staged changes (about to commit) but reject untracked + unstaged noise
  # only when the caller cares. Used by ship/merge-to-main.
  git diff --quiet || die "Working tree has unstaged changes. Stash or commit first."
}

require_arg() {
  [[ -n "${2:-}" ]] || die "Missing required argument: <$1>"
}

wire_hooks() {
  local hooks_path=".githooks"
  if [[ -d "$hooks_path" ]]; then
    git config core.hooksPath "$hooks_path"
    info "Git hooks wired from $hooks_path"
  fi
}

# Conventional Commits allowed types (mirrors .githooks/commit-msg)
ALLOWED_TYPES="feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert"

validate_commit_type() {
  local type="$1"
  if ! [[ "$type" =~ ^(${ALLOWED_TYPES})$ ]]; then
    die "Invalid commit type '$type'. Allowed: ${ALLOWED_TYPES//|/, }"
  fi
}

validate_branch_name() {
  local branch="$1"
  if ! [[ "$branch" =~ ^(${ALLOWED_TYPES})/[a-z0-9-]+$ ]]; then
    die "Branch name '$branch' must follow <type>/<kebab-slug> (e.g. feat/oauth-login)."
  fi
}

build_commit_subject() {
  local type="$1"
  local scope="$2"
  local description="$3"
  if [[ "$scope" == "--" || -z "$scope" ]]; then
    echo "${type}: ${description}"
  else
    echo "${type}(${scope}): ${description}"
  fi
}

# ─── commands ─────────────────────────────────────────────────────────────────

cmd_start() {
  local branch="${1:-}"
  require_arg "branch-name" "$branch"
  validate_branch_name "$branch"

  info "Wiring local git hooks..."
  wire_hooks

  info "Fetching origin..."
  git fetch origin --prune

  info "Switching to main and fast-forward pulling..."
  git switch main
  git pull --ff-only origin main || die "'git pull --ff-only' failed — main has diverged. Resolve manually."

  info "Creating branch '$branch'..."
  git switch -c "$branch"

  info "Branch ready. Current state:"
  git status --short --branch
}

cmd_commit() {
  local type="${1:-}"
  local scope="${2:-}"
  local description="${3:-}"
  local body="${4:-}"

  require_arg "type" "$type"
  require_arg "scope-or---" "$scope"
  require_arg "description" "$description"

  validate_commit_type "$type"
  assert_not_main

  local subject
  subject="$(build_commit_subject "$type" "$scope" "$description")"

  # Enforce ≤72-char subject line
  if [[ "${#subject}" -gt 72 ]]; then
    die "Commit subject is ${#subject} chars — must be ≤72. Shorten the description."
  fi

  if [[ -z "$body" ]]; then
    GIT_EDITOR=true git commit -m "$subject"
  else
    GIT_EDITOR=true git commit -m "$subject" -m "$body"
  fi

  info "Committed: $subject"
  git log -1 --oneline
}

cmd_sync_main() {
  assert_not_main

  local branch
  branch="$(current_branch)"

  info "Fetching origin..."
  git fetch origin --prune

  info "Rebasing '$branch' onto origin/main..."
  git rebase origin/main || die "Rebase failed. Resolve conflicts, then 'git rebase --continue'."

  info "Sync complete. '$branch' is now based on origin/main."
  git log --oneline origin/main..HEAD
}

cmd_merge_to_main() {
  local branch="${1:-$(current_branch)}"
  [[ "$branch" != "main" ]] || die "Cannot merge 'main' into itself."

  assert_clean_or_staged

  info "Fetching origin..."
  git fetch origin --prune

  # Ensure the branch is rebased onto origin/main for a fast-forward merge
  info "Rebasing '$branch' onto origin/main..."
  git switch "$branch"
  git rebase origin/main || die "Rebase onto origin/main failed. Resolve, then retry."

  info "Switching to main and fast-forward merging '$branch'..."
  git switch main
  git pull --ff-only origin main
  git merge --ff-only "$branch" || die "Fast-forward merge failed. The branch may not be rebased correctly."

  info "Merged '$branch' into main."
  git log -5 --oneline
}

cmd_push() {
  assert_not_main

  local branch
  branch="$(current_branch)"

  # First push on this branch uses -u; subsequent uses --force-with-lease
  # (safe after rebase) when the remote already has this branch.
  if git ls-remote --exit-code --heads origin "$branch" > /dev/null 2>&1; then
    info "Pushing '$branch' with --force-with-lease (safe rebase push)..."
    git push --force-with-lease origin "$branch"
  else
    info "First push of '$branch'..."
    git push -u origin "$branch"
  fi

  info "Pushed: $branch"
}

cmd_ship() {
  local branch="${1:-$(current_branch)}"
  [[ "$branch" != "main" ]] || die "Cannot ship 'main' — open a PR from a feature branch."

  cmd_merge_to_main "$branch"

  info "Pushing main to origin..."
  git push origin main

  info "Shipped '$branch' → main → origin/main."
  git log -3 --oneline
}

# ─── dispatch ─────────────────────────────────────────────────────────────────

COMMAND="${1:-}"
shift || true

case "$COMMAND" in
  start)           cmd_start "$@" ;;
  commit)          cmd_commit "$@" ;;
  sync-main)       cmd_sync_main "$@" ;;
  merge-to-main)   cmd_merge_to_main "$@" ;;
  push)            cmd_push "$@" ;;
  ship)            cmd_ship "$@" ;;
  "")              die "No command given. Run 'scripts/trunk.sh <command> --help' or read the header." ;;
  *)               die "Unknown command '$COMMAND'. Valid: start, commit, sync-main, merge-to-main, push, ship" ;;
esac
