---
description: Open a pull request for the current branch after the readiness checklist passes
mode: agent
---

# Open pull request

Ship the current branch to review. Do not open the PR until every item in the readiness checklist holds.

## Readiness checklist

Report each item's status before proceeding. If any fails, stop and fix first.

- [ ] Current branch is not `main` and not a `release/*` branch.
- [ ] Working tree is clean: `git status --short` is empty.
- [ ] Branch is rebased on the latest `origin/main` (run `/git-sync` if unsure).
- [ ] Local checks pass:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm commitlint --from=origin/main --to=HEAD`
- [ ] Commit count is reasonable (< ~10). If higher, consider an interactive rebase to squash fixups, and ask me first.
- [ ] Net diff is ≤ 400 LOC (excluding lockfiles and generated files). If larger, ask whether to split the PR.

## Procedure

1. **Push with upstream.**
   ```bash
   git push -u origin HEAD
   ```
   If the branch was rebased and was previously pushed:
   ```bash
   git push --force-with-lease
   ```

2. **Compose the PR title** as a Conventional Commit. This will become the squash-merge commit subject on `main`.
   - If the branch contains one logical change, reuse that commit's subject.
   - If the branch contains several commits, synthesise a new subject that captures the whole.
   - Format: `<type>(<scope>)[!]: <description>`. Same 72-char rule applies.

3. **Compose the PR body** using `.github/PULL_REQUEST_TEMPLATE.md`. Fill in every section:
   - **What** — 1–2 lines of plain description.
   - **Why** — the motivation; link the issue if one exists.
   - **How** — bullet list of key changes. Note non-obvious design decisions.
   - **Feature flag** — name and default state, or "n/a".
   - **Risk & rollback** — what breaks if this is wrong, and how to revert.
   - **Test evidence** — what ran green and where (local, CI).
   - **Screenshots / traces** — for UI or observable behaviour changes.

4. **Open the PR.**
   ```bash
   gh pr create \
     --base main \
     --head "$(git branch --show-current)" \
     --title "<conventional-commit-title>" \
     --body-file .github/pr-body.tmp.md
   ```
   Show me the resulting PR URL.

5. **Request reviewers.** Use the CODEOWNERS assignment if one exists; otherwise ask me who to add.

6. **Stop.** Do not watch CI, do not merge, do not approve. The PR is the reviewer's domain now.

## Constraints

- **Never** merge the PR yourself, even if you have the permission. That is the reviewer's decision. (Rule 9.1 of `GIT_WORKFLOW.md`.)
- **Never** mark the PR as ready for review if CI is red.
- **Never** dismiss review comments. Address them in new commits or ask for clarification.
- **Never** force-push after a review has started without informing the reviewer — it invalidates their line-level comments. If the branch needs a rebase during review, push the rebase and then comment on the PR explaining.
