---
description: Rebase the current branch onto the latest origin/main
mode: agent
---

# Sync with trunk

Bring this branch up to date with `origin/main` via rebase. Do this at least once per day if the branch is still open, and always immediately before opening or updating a PR.

## Procedure

1. **Verify the working tree is clean.**
   ```bash
   git status --short
   ```
   If dirty, stop and ask: commit the changes (via `/git-checkpoint`), or stash them (`git stash push -m "sync-stash"`)? Do not rebase over uncommitted work.

2. **Confirm the current branch.**
   ```bash
   git branch --show-current
   ```
   Abort if the result is `main` or starts with `release/` — these branches are never rebased.

3. **Fetch.**
   ```bash
   git fetch origin
   ```

4. **Show me the divergence** so I can confirm the rebase is wanted:
   ```bash
   git --no-pager log --oneline --graph origin/main...HEAD
   ```

5. **Rebase.**
   ```bash
   git rebase origin/main
   ```

6. **Handle conflicts, if any.**
   - Show the conflicted file(s) and the conflict markers.
   - Propose a resolution. Explain the reasoning — which side's intent is preserved and why.
   - Wait for my confirmation before writing.
   - After resolving a file:
     ```bash
     git add <file>
     ```
   - After all conflicts in the current replay-step are resolved:
     ```bash
     git rebase --continue
     ```
   - If I say "abort" at any point:
     ```bash
     git rebase --abort
     ```

7. **Verify the result.**
   ```bash
   git --no-pager log --oneline origin/main..HEAD
   pnpm typecheck && pnpm test:affected
   ```
   If type-check or tests now fail (they passed before the rebase), the rebase surfaced a semantic conflict — stop and ask.

8. **Push with lease.**
   ```bash
   git push --force-with-lease
   ```
   Explain in the push message/PR comment that the branch was rebased.

## Constraints

- **Never** run `git push --force` without `--force-with-lease`. The lease check prevents clobbering a teammate's push that raced with your rebase.
- **Never** rebase `main` itself. `main` is append-only from the team's perspective.
- **Never** "resolve" conflicts by blindly accepting one side (`git checkout --ours` / `--theirs`) without reading both — this loses work silently.
- **Never** continue a rebase while tests are red. The rebase is only done when the tree builds and tests pass.
- If the rebase looks too complex (more than ~3 conflicted files or any ambiguity about intent), stop and hand control back to me.
