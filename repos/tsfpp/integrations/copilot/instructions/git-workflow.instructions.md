---
description: Trunk-based development and Conventional Commits — always-on git workflow for agents
applyTo: "**"
---

# Git workflow (TBX v1.0.0)

This repository practises trunk-based development with Conventional Commits. The canonical source is `GIT_WORKFLOW.md` at the repository root. This file is the hot-path summary; the full spec wins in any conflict.

## Branching rules

- `main` is the only long-lived branch. Never commit to `main` directly.
- Before writing a single file, verify you are on a branch other than `main`. If you are on `main`, run the `start-work` flow first.
- Branch names: `<type>/<kebab-slug>` where `<type>` is a Conventional Commit type (`feat`, `fix`, `refactor`, …). Examples: `feat/user-auth`, `fix/parser-race`, `refactor/extract-lexer`.
- Branches are short-lived: ≤ 2 days, ideally < 1 day. If the work is bigger, use a feature flag to slice it (§5 of spec).
- Always branch from an up-to-date `main`:
  ```bash
  git fetch origin
  git switch main
  git pull --ff-only origin main
  git switch -c <type>/<slug>
  ```

## Commit rules

- Every commit is atomic — one logical change. If the subject needs "and", split it.
- Stage deliberately (`git add <path>` or `git add -p`), not `git add .`, unless the working tree contains only the intended change.
- Every commit message follows Conventional Commits v1.0.0:
  ```
  <type>[(scope)][!]: <description in imperative, lowercase, ≤72 chars, no period>

  <optional body explaining WHY, wrapped at 72>

  <optional footers: BREAKING CHANGE, Refs, Closes, Co-authored-by>
  ```
- Allowed types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`.
- Breaking changes: `!` after type/scope AND `BREAKING CHANGE: <desc>` footer.
- Every commit must build; run type-check and affected tests before committing code changes.

## Integration rules

- Rebase onto `origin/main` before opening or updating a PR. Never merge `main` into a feature branch.
- Push at least once per working day — a push is a backup and a CI signal.
- On first push: `git push -u origin HEAD`. On subsequent pushes after a rebase: `git push --force-with-lease` (never bare `--force`).
- Pull requests squash-merge or rebase-merge into `main`; no merge commits.
- Target ≤ 400 net LOC changed per PR. Larger diffs lose reviewer attention.

## Incomplete work

- Merge to `main` only behind a feature flag or via branch-by-abstraction. Never merge code that is "off until we finish it" without a named, addressable flag.
- Every flag has an owner and a target removal date in its definition.

## Agent-specific constraints (binding on you, the agent)

1. **Never merge a PR you authored.** Open the PR, request reviewers, stop.
2. **Never run `git push --force`, `git push -f`, `git reset --hard`, `git clean -fd`, or `rm -rf .git` without asking me in the current turn.** A blanket earlier "yes" does not count — each destructive op needs its own confirmation.
3. **Never push to `main`.** Pushes go to feature branches that then open a PR.
4. **Before staging any change, verify the current branch.** If `git branch --show-current` returns `main`, stop and start a branch first.
5. **Propose the commit message and wait.** Show the subject and body. I will confirm, amend, or reject. Do not run `git commit` before confirmation.
6. **Commit at logical checkpoints**, not at the end of a 1000-line monologue. After a test passes, after a refactor step completes, after a coherent slice is done — that is a commit boundary.

## Forbidden operations (agent must refuse and explain)

- `git push` or `git push --force` to `main`.
- `git push --force` without `--force-with-lease`.
- `git rebase` of `main` itself.
- `git reset --hard` on a shared branch.
- Committing files matching `.env*`, `*.key`, `*.pem`, `id_rsa*`, `credentials.json`, or paths in `.gitignore`.
- Committing `node_modules/`, `dist/`, build outputs.
- Merge commits landing on `main`.
- Commit messages that are not Conventional Commits. (The `commit-msg` hook will reject them anyway; do not try to bypass with `--no-verify`.)

## The five prompts you should know

Each of these corresponds to a file in `integrations/copilot/prompts/`. When I invoke them by name, follow the linked procedure verbatim.

| Prompt | When |
|--------|------|
| `/git-start-work` | Beginning of any new change. Establishes branch from fresh `main`. |
| `/git-checkpoint` | Logical checkpoint reached. Commits atomically with a Conventional Commit message. |
| `/git-sync` | Branch diverges from `main` or before opening a PR. Rebases on `origin/main`. |
| `/git-open-pr` | Work complete, tests green, rebased. Pushes and opens the PR. |
| `/git-hotfix` | Emergency fix to a deployed release. Follows the land-on-main-first then cherry-pick protocol. |

If none of these matches the situation, ask before acting on git.
