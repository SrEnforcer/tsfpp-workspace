---
description: Emergency fix against a deployed release — lands on main first, then cherry-picks to the release branch
mode: agent
---

# Hotfix

A user-visible defect in a deployed release needs a correction. The fix lands on `main` first (canonical source of truth), then is cherry-picked to the relevant `release/X.Y.x` branch and tagged. Never fix on the release branch first.

## Procedure

### Phase 1 — Land on `main`

1. **Identify the release** that needs the fix. Ask me which version (e.g. `v1.4.0`) and confirm the corresponding release branch exists (`release/1.4.x`). If no release branch exists, stop and ask — hotfixes imply a patched release cadence.

2. **Run `/git-start-work`** to create a `fix/<slug>` branch from fresh `main`. The slug names the defect, not the fix.

3. **Implement, test, and `/git-checkpoint`** as usual. Commit type must be `fix`.

4. **Run `/git-open-pr`.** Flag the PR as a hotfix in the title prefix or label so reviewers prioritise:
   ```
   fix(<scope>): <description>   [HOTFIX]
   ```
   Body additionally contains:
   - **Target release:** `v1.4.x`
   - **Severity:** (P0/P1/…)
   - **Cherry-pick plan:** "Merge to main, then cherry-pick SHA to release/1.4.x and tag v1.4.1."

5. **Wait for merge to `main`.** Do not proceed to Phase 2 until `main` contains the fix. Record the squash-merge commit SHA on `main`.

### Phase 2 — Cherry-pick to release branch

6. **Switch to the release branch** and ensure it is clean and current:
   ```bash
   git switch release/1.4.x
   git pull --ff-only origin release/1.4.x
   git status --short
   ```

7. **Cherry-pick the fix commit** from `main`:
   ```bash
   git cherry-pick <sha-from-main>
   ```
   - Resolve any conflicts (release branch may lack refactors that `main` has). Resolve toward the release branch's intent: keep the fix's semantics, adapt to the older surrounding code.
   - After resolving: `git add <files>` and `git cherry-pick --continue`.
   - If you cannot cleanly cherry-pick (e.g. the fix depends on a refactor that never went to the release branch), stop. Tell me. The fix may need a bespoke re-implementation on the release branch, which is a separate PR.

8. **Run the tests** relevant to the release branch:
   ```bash
   pnpm typecheck && pnpm test
   ```

9. **Push the release branch:**
   ```bash
   git push origin release/1.4.x
   ```
   (If the release branch is protected, open a separate PR into it — same flow as `/git-open-pr` but `--base release/1.4.x`.)

### Phase 3 — Tag and release

10. **Tag the patched release:**
    ```bash
    git tag -a v1.4.1 -m "release v1.4.1 — hotfix <slug>"
    git push origin v1.4.1
    ```

11. **Report back** to me with:
    - SHA on `main`
    - SHA on `release/1.4.x` after cherry-pick
    - Tag created

## Constraints

- **Never** commit the fix directly on `release/1.4.x` as the first landing. It must land on `main` first (Rule 6.3 of `GIT_WORKFLOW.md`). If someone argues the emergency is too urgent, this rule still holds — the main-landing PR can be reviewed and merged in minutes for a true P0.
- **Never** merge `main` into `release/1.4.x`. Cherry-pick only. Merging `main` would drag along every other change since the release, defeating the point of a release branch.
- **Never** skip the test run on the release branch. Code that passes on `main` may fail on the older release branch due to missing refactors.
- **Never** force-push a release branch.
