# Workspace Operations Cheat Sheet

This is the practical runbook for the TSF++ workspace.

## What this workspace is

- Root repository is the control plane.
- Child repositories live in `repos/*` as Git subtrees.
- Sync helpers live in `scripts/*`.

## Core rule

Always push subtree changes before pulling subtree changes when local subtree history is ahead.

`./scripts/pull-all.sh` now enforces this with a preflight and will abort when needed.

## Single-command helpers

Use the orchestration script when you want one command instead of manual steps.

1. Show current status:

```bash
./scripts/workspace-ops.sh status
```

2. Run full safe sync (requires clean root workspace):

```bash
./scripts/workspace-ops.sh sync
```

3. Auto-checkpoint dirty work, then sync:

```bash
./scripts/workspace-ops.sh checkpoint-sync "chore: workspace checkpoint before sync"
```

## Daily flow (most common)

1. Check workspace state.

```bash
git status --short --branch
```

2. Commit local work in root.

```bash
git add -A
git commit -m "<message>"
```

3. Push subtree changes out first.

```bash
./scripts/push-all.sh
```

4. Pull upstream subtree changes in.

```bash
./scripts/pull-all.sh
```

5. Push root repository.

```bash
git push origin main
```

## Publish flow (internal package releases)

1. Use dependency-aware order:

- `standard` and `prelude`
- `boundary`
- `mcp-server`
- `agents`

2. For each package, run from that package directory under `repos/<name>`:

```bash
pnpm install --lockfile-only
npm publish --access public --dry-run
npm publish --access public
```

3. After publish-related edits in subtree files:

```bash
git add -A
git commit -m "chore: release graph updates"
./scripts/push-all.sh
./scripts/pull-all.sh
git push origin main
```

## Divergence recovery flow

Use when `pull-all` aborts due to local-ahead or diverged subtree history.

1. Commit current root changes.

```bash
git add -A
git commit -m "chore: checkpoint before subtree sync"
```

2. Push subtree histories first.

```bash
./scripts/push-all.sh
```

3. Pull again.

```bash
./scripts/pull-all.sh
```

4. If conflicts still happen, resolve intentionally, commit, and repeat step 3.

## Do-not-do list

- Do not run `pull-all` with a dirty root workspace.
- Do not skip `push-all` when preflight reports local-ahead.
- Do not use version-pinned `minimumReleaseAgeExclude` for internal packages.
- Do not assume "published on npm" means immediately allowed by local pnpm policy.
- Do not rely on file recency; subtree merge decisions are ancestry-based.

## Fast diagnostics

1. Root dirty check:

```bash
git status --short --branch
```

2. Confirm last subtree sync action:

```bash
git log --oneline -n 15
```

3. Validate pnpm policy view in a package repo:

```bash
pnpm config get minimumReleaseAgeExclude
pnpm config list --json
```
