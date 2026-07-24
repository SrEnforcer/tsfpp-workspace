# tsfpp workspace

This repository is set up as a single workspace root that contains multiple repositories as subtree-managed directories so Claude Code can read and edit everything from one place.

## Structure

- `repos/` for subtree-managed copies of the project repositories
- `shared/` for code reused across projects, if needed later
- `docs/` for notes, design decisions, or runbooks

## Why subtrees here?

Each project lives inside this repository as ordinary tracked files, so cloud tools can read the full workspace from one clone. Changes can still be pushed back to the original child repositories with `git subtree push`.

## GitHub SSH

The local SSH key `id_ed25519_tsfpp` authenticates successfully as GitHub user `tsfpp`.

## Workflow helpers

- [WORKSPACE.md](WORKSPACE.md) documents the root-first workflow.
- [docs/workspace-architecture-and-rationale.md](docs/workspace-architecture-and-rationale.md) explains the dependency graph, pinning policy, and publish order.
- `scripts/status-all.sh` shows the status of every subtree path.
- `scripts/pull-all.sh` pulls upstream changes from the child repositories.
- `scripts/push-all.sh` pushes committed subtree changes back to the child repositories.
- `scripts/check-releases.sh` reports which packages need publishing and flags exact version pins (read-only).
