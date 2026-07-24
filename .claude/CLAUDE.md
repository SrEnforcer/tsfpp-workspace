# CLAUDE.md

This file defines the expected workflow for AI assistants operating in this workspace.

## Workspace Model

- Root repository is the control plane.
- Child repositories are managed as Git subtrees under `repos/*`.
- Operations are script-driven from root `scripts/*`.

## Source of Truth

Read these first before making cross-repo changes:

1. `WORKSPACE.md`
2. `docs/workspace-architecture-and-rationale.md`
3. `docs/workspace-operations-cheat-sheet.md`

## Default Operating Mode

Prefer the single-entry helper:

- `./scripts/workspace-ops.sh status`
- `./scripts/workspace-ops.sh sync`
- `./scripts/workspace-ops.sh checkpoint-sync "<message>"`

Use `sync` for normal operations and `checkpoint-sync` when the workspace is dirty and the user wants to proceed.

## Required Sync Order

Never change this order:

1. Push subtree changes first: `./scripts/push-all.sh`
2. Pull subtree changes second: `./scripts/pull-all.sh`
3. Push root repo last: `git push origin <branch>`

`pull-all` includes preflight checks and will abort on local-ahead or diverged subtree history.

## Guardrails

- Do not run `pull-all` with a dirty root workspace.
- Do not bypass preflight warnings by manual force operations.
- Do not use destructive Git commands unless explicitly requested.
- Do not rewrite subtree history casually.

## Publishing Guidance

When publishing internal packages, follow dependency order:

1. `standard` and `prelude`
2. `boundary`
3. `mcp-server`
4. `agents`

For policy-sensitive packages, verify lockfile/policy before publish:

- `pnpm install --lockfile-only`
- `npm publish --access public --dry-run`
- `npm publish --access public`

## Policy Notes

- Treat pnpm supply-chain policy (`minimumReleaseAge*`) as part of release choreography.
- Prefer package-name-only `minimumReleaseAgeExclude` entries for internal packages.
- Avoid version-pinned exclusions for internal packages unless there is a specific temporary reason.

## Failure Handling

If sync fails:

1. Stop and inspect `git status --short --branch`.
2. Resolve conflicts intentionally (do not discard unknown changes).
3. Commit the resolution.
4. Resume with the standard order (push-all -> pull-all -> root push).

## Expected Assistant Behavior

- Keep changes minimal and explicit.
- Explain which script/step is being run and why.
- Prefer repeatable scripted flows over ad hoc command sequences.
