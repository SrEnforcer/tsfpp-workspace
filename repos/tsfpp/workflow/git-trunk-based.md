# Trunk-Based Development

TSF++ projects use trunk-based development (TBD). This document describes
the rules, rationale, and mechanics. The `scripts/trunk.sh` helper automates
the most common operations.

---

## Core rules

1. **`main` is the trunk.** It is always deployable / publishable.
2. **No direct commits to `main`.** All changes arrive via a PR from a
   short-lived feature branch.
3. **Branches are short-lived.** Target merge within one working day.
   If a branch lives longer than three days, decompose the work.
4. **No force-push to `main`.** Ever. Force-with-lease is allowed only on
   personal feature branches that have been rebased.
5. **Linear history on `main`.** PRs are merged via squash or rebase.
   Merge commits are not used.
6. **All CI checks must pass before merge.** No overriding the required
   status checks.

---

## Branch naming

```
<type>/<kebab-slug>
```

Where `<type>` matches one of the Conventional Commits types:

| Type       | Use for                                         |
|------------|-------------------------------------------------|
| `feat`     | New rules, new prelude combinators, new docs    |
| `fix`      | Bug fixes in prelude, tooling, or examples      |
| `docs`     | Documentation-only changes                      |
| `refactor` | Internal restructuring, no behaviour change     |
| `test`     | Adding or correcting tests                      |
| `chore`    | CI, dependency updates, repo maintenance        |
| `perf`     | Performance improvements                        |

Examples:
```
feat/rule-12-3-readonly-tuples
fix/prelude-result-map-laws
docs/adoption-guide-incremental-section
chore/update-vitest-3
```

---

## Workflow

### Start a branch

```sh
scripts/trunk.sh start feat/my-feature
# equivalent: git checkout -b feat/my-feature main
```

### Make commits

Follow Conventional Commits (see `workflow/conventional-commits.md`).

```sh
scripts/trunk.sh commit feat prelude "add Result.flatMap combinator"
```

### Stay in sync

Rebase onto `main` frequently — at least once a day if the branch is open.

```sh
scripts/trunk.sh sync-main
# equivalent: git fetch origin && git rebase origin/main
```

### Merge

Squash-merge via GitHub PR UI, or:

```sh
scripts/trunk.sh ship feat/my-feature
# equivalent: switch to main, pull, merge --squash, push
```

---

## Release flow

Releases are managed by `release-please`. When a PR targeting `main` is merged
with a `feat:`, `fix:`, or `perf:` commit, `release-please` opens a Release PR
that bumps the relevant package version and updates the changelog. Merging the
Release PR triggers the npm publish workflow.

There is no separate release branch. The tag is applied to the merge commit on
`main`.

---

## Feature flags vs. feature branches

Prefer feature flags for long-running work over long-lived branches. A partial
implementation behind a flag can be merged to `main` daily; the flag gates
exposure without accumulating merge debt.

---

## Reference

- [trunkbaseddevelopment.com](https://trunkbaseddevelopment.com)
- `scripts/trunk.sh` — helper automation
- `workflow/conventional-commits.md` — commit message format
