# tsfpp workspace

This repository is set up as a single workspace root that contains multiple Git repositories so Claude Code can read and edit everything from one place.

## Structure

- `repos/` for the checked-out Git repositories
- `shared/` for code reused across projects, if needed later
- `docs/` for notes, design decisions, or runbooks

## Why submodules here?

Each repository keeps its own history, but they live under one parent workspace so Claude Code can inspect and edit them together.

## GitHub SSH

The local SSH key `id_ed25519_tsfpp` authenticates successfully as GitHub user `tsfpp`.

## Workflow helpers

- [WORKSPACE.md](WORKSPACE.md) documents the root-first workflow.
- `scripts/status-all.sh` shows the status of every submodule.
- `scripts/push-all.sh` pushes changed submodules from the root.
