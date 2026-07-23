---
description: Start a new piece of work by branching from an up-to-date main
mode: agent
---

# Start work

Establish the correct working state before any file is edited. Follow this procedure exactly. Do not write any source file until the branch is created and confirmed.

## Procedure

1. **Survey current state.**
   ```bash
   git status --short
   git branch --show-current
   git log -1 --oneline
   ```
   If the working tree is dirty and the changes are unrelated to the task I gave you, stop and ask whether to stash, commit elsewhere, or discard.

2. **Determine the work type.** Ask me for a one-sentence description of the change if you don't already have one from my preceding prompt. From the description, pick the Conventional Commit type (`feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`). If the intent is ambiguous between two types, ask.

3. **Derive a kebab-case slug** of ≤ 4 words from the task description. Avoid generic words like "update", "change", "improve" — they carry no information.

4. **Propose the branch name** as `<type>/<slug>` and wait for my confirmation. Examples:
   - "add OAuth login" → `feat/oauth-login`
   - "fix race in token refresh" → `fix/token-refresh-race`
   - "extract lexer from parser" → `refactor/extract-lexer`

5. **Synchronise `main`.** Run, showing output:
   ```bash
   git fetch origin
   git switch main
   git pull --ff-only origin main
   ```
   If `pull --ff-only` fails, stop — `main` has diverged locally, which needs human attention.

6. **Create and switch to the branch:**
   ```bash
   git switch -c <type>/<slug>
   ```

7. **Confirm state.** Show `git status` and `git branch --show-current`. Only now begin the actual work.

## Constraints

- Never create a branch from anything other than freshly pulled `origin/main`.
- Never branch from a branch other than `main` (no stacked/nested feature branches in this workflow).
- Never skip the `git fetch` — local `main` may be days stale.
- If the task reveals itself to be two independent changes, stop and recommend splitting into two branches; do not start one branch that bundles both.
