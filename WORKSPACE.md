# Workspace workflow

Work from the repository root.

## Read and edit

- Open the root in Claude Code.
- Work inside the subtree directories under `repos/`.
- Keep changes local to the repo that owns the code.

## Commit flow

1. Edit and commit in the root repo.
2. Push the root repo.
3. Run `scripts/push-all.sh` to push committed subtree changes back to the child repos.

## Sync flow

1. Run `scripts/pull-all.sh` to import upstream changes from the child repos.
2. Resolve any merge conflicts in the root workspace.
3. Commit the updated root state.

## Helpful commands

- `scripts/status-all.sh` shows git status for every subtree path.
- `scripts/pull-all.sh` pulls upstream changes from the child repos.
- `scripts/push-all.sh` pushes committed subtree changes back to the child repos.
- `scripts/check-releases.sh` (read-only) reports which packages need publishing
  (local version vs npm) and flags any internal dependency pinned to an exact
  version. Run it before a release round.

## SSH

The GitHub user `tsfpp` is already reachable with `~/.ssh/id_ed25519_tsfpp`.
