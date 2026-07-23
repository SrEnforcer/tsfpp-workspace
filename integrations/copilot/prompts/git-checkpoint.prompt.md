---
description: Commit the current work as one or more atomic Conventional Commits
mode: agent
---

# Checkpoint

Create a clean, atomic commit (or several, one per concern) for the current state. Never lump unrelated changes into a single commit.

## Procedure

1. **Survey the delta.**
   ```bash
   git status --short
   git --no-pager diff --stat
   git --no-pager diff
   ```

2. **Group changes by concern.** A concern is a single logical intent: one feature addition, one fix, one refactor, one docs update. If the diff spans multiple concerns, plan multiple commits — one per concern.

3. **For each group, in order of dependency (refactors before features that depend on them):**

   a. **Stage only the files in this group.** Use explicit paths:
      ```bash
      git add <path1> <path2> ...
      ```
      If the file mixes concerns, use `git add -p <path>` to stage hunks.
      Never `git add .` if other unrelated changes are present.

   b. **Verify the build** for the staged content:
      ```bash
      pnpm typecheck   # or equivalent in this repo
      pnpm lint
      pnpm test:affected
      ```
      If any check fails, do not proceed with the commit — fix first or unstage.

   c. **Compose the commit message** per Conventional Commits v1.0.0:
      ```
      <type>(<scope>)[!]: <description>

      <body: why, not what; wrap at 72>

      <footers: BREAKING CHANGE / Refs / Closes / Co-authored-by>
      ```
      Constraints on the subject:
      - Type from the allowed set (`feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`).
      - Scope from the allowed list in `commitlint.config.js` (ask if unsure).
      - Imperative mood: "add", not "added" or "adds".
      - Lowercase start, no trailing period, ≤ 72 characters.

   d. **Propose the full message to me and wait.** Show subject + body + footers. I confirm, amend, or reject.

   e. **On confirmation, commit:**
      ```bash
      git commit -m "<subject>" -m "<body>" -m "<footer>"
      ```
      Or write the message to a file and use `git commit -F <file>` for multi-paragraph bodies. The `commit-msg` hook will run commitlint; if it rejects, fix the message and retry — do not pass `--no-verify`.

4. **Push** once all commits for this checkpoint are in:
   ```bash
   git push                          # subsequent pushes
   git push -u origin HEAD           # first push on this branch
   ```
   Pushing is encouraged even on partial work — backup and CI signal.

## Constraints

- No commit touches unrelated concerns. If in doubt, split.
- No `--no-verify` to bypass hooks. Hooks exist to catch real mistakes.
- No commit messages like "wip", "update", "fix stuff", "checkpoint". If the change is genuinely WIP, the branch itself is the WIP marker; the commits still describe what landed.
- If the change breaks a test that used to pass, the commit is not a checkpoint — it is a regression. Stop and fix.
- If a file in the staging area contains secrets, stop and remove the file from history before committing.
