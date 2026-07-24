# Workspace Ops (Safe Sync)

Use this prompt to run the TSF++ workspace operation sequence safely.

## Intent

Automate routine workspace sync with the correct order and guardrails:

1. checkpoint commit if requested and needed
2. push subtree repos first
3. pull subtree repos second
4. push root repo last

## Instructions for Copilot

When this prompt is invoked:

1. Run `git status --short --branch`.
2. If dirty and user asked to proceed anyway, run:
   - `./scripts/workspace-ops.sh checkpoint-sync "<message>"`
3. If clean, run:
   - `./scripts/workspace-ops.sh sync`
4. Report final `git status --short --branch` and list any conflicts or blockers.

## Safety

- Never run pull before push when local subtree history may be ahead.
- If a command fails, stop and report the exact failure step.
- Do not discard local changes.
