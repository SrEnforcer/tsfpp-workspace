---
name: trunk-based-development
description: 'Trunk-based development workflow for Git. Use when planning, implementing, reviewing, and merging small changes on main with short-lived branches, CI gates, and fast feedback.'
argument-hint: 'Task or feature to deliver on trunk'
---

# Trunk-Based Development Workflow

## Outcome

Ship small, safe, reversible changes to `main` quickly with strong CI discipline and minimal branch drift.

## When to Use

- You want fast delivery with low merge friction.
- You want small PRs merged to `main` many times per day.
- You need consistent guardrails for feature, bugfix, and hotfix work.

## Inputs

- A task description.
- A clean working tree.
- A passing CI pipeline on `main`.

## Procedure

1. Sync and branch
- Update `main` from remote.
- Create a short-lived branch from current `main`.
- Branch naming suggestion: `feat/<task>`, `fix/<task>`, `chore/<task>`.

2. Slice work into vertical increments
- Implement the smallest user-visible or testable slice first.
- Keep each commit focused and reversible.
- Prefer one concern per commit.

3. Keep trunk compatibility
- Rebase or merge `main` into your branch frequently.
- Resolve conflicts early while context is fresh.
- If a change is risky or incomplete, protect it with a feature flag.

4. Verify continuously
- Run local quality gates before pushing:
  - typecheck
  - lint
  - tests
  - build
- Push often to trigger CI early.

5. Open and merge a small PR
- Open PR as soon as scope is reviewable.
- Keep PR small enough to review in one sitting.
- Address review comments quickly.
- Merge once CI passes and approvals are complete.

6. Post-merge hygiene
- Delete merged branch.
- Pull latest `main`.
- Confirm release notes/changelog impact if needed.

## Decision Points

- If work exceeds one day or grows beyond a small PR:
  - Split into multiple slices and sequence by dependency.
  - Use feature flags for partial rollout.

- If CI fails:
  - Stop adding scope.
  - Fix failing checks first.
  - Re-run full gates before merge.

- If urgent production fix is needed:
  - Create `hotfix/<task>` from latest `main`.
  - Apply minimal fix with tests.
  - Fast-track review and merge.

## Completion Criteria

- Branch is rebased/merged with latest `main`.
- PR is small, reviewed, and understandable.
- CI is green on final commit.
- No unresolved TODOs required for correctness.
- Branch deleted after merge.

## Suggested Command Sequence

```sh
git switch main
git pull --ff-only
git switch -c feat/my-task

# work loop
pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build
git add -A
git commit -m "feat: implement first vertical slice"
git push -u origin feat/my-task
```

## Notes

- Prefer merge queue or squash merge for linear trunk history.
- Keep cycle time short: branch lifetime should usually be hours, not days.
- Optimize for releasability over batch size.
