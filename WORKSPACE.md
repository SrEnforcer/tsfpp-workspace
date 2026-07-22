# Workspace workflow

Work from the repository root.

## Read and edit

- Open the root in Claude Code.
- Work inside the submodules under `repos/`.
- Keep changes local to the repo that owns the code.

## Commit flow

1. Commit changes inside the relevant submodule.
2. Push that submodule to its own GitHub repo.
3. Commit the updated submodule pointer in the root repo.
4. Push the root repo last.

## Helpful commands

- `scripts/status-all.sh` shows status for every submodule.
- `scripts/push-all.sh` pushes submodules that have local changes.

## SSH

The GitHub user `tsfpp` is already reachable with `~/.ssh/id_ed25519_tsfpp`.
