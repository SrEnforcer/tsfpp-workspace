<!--
  Title format: <type>(<scope>)[!]: <description>
  Example:      feat(auth): add refresh-token rotation
  This title becomes the squash-merge commit subject on main.
-->

## What

<!-- 1–2 lines, plain description of what changes. -->

## Why

<!-- Motivation. Link the issue, ticket, or user report. Explain the trade-off considered. -->

Refs: #

## How

<!-- Bullet list of the key changes. Call out non-obvious design decisions and rejected alternatives. -->

-
-

## Feature flag

<!-- If this PR gates incomplete work behind a flag, name it and state its default.
     If not applicable, write "n/a". -->

- **Name:**
- **Default:**
- **Owner:**
- **Target removal date:**

## Risk & rollback

<!-- What breaks if this is wrong? How do we revert?
     Single commit squash-merge → `git revert <sha>` on main. State any data/migration caveats. -->

## Test evidence

<!-- What ran green, where, and with what relevant flags enabled.
     Include property-test seeds for reproducibility if applicable. -->

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm commitlint --from=origin/main --to=HEAD`
- [ ] Branch rebased on `origin/main`
- [ ] Net diff ≤ 400 LOC (excluding lockfiles/generated)

## Screenshots / traces

<!-- For user-visible or observable changes. Remove if not applicable. -->

---

### Reviewer checklist

- [ ] Title is a valid Conventional Commit and accurately describes the change.
- [ ] Commits are atomic; no "wip" / "fix stuff" messages.
- [ ] No secrets, no generated artefacts, no unrelated file changes.
- [ ] Feature flag (if any) has an owner and a removal date.
- [ ] CI is green.
