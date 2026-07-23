# Copilot Integration Slice

This directory contains the curated GitHub Copilot setup for TSF++.

Clean separation of concerns:

- `copilot-instructions.md` — always-on baseline behavior and TSF++ hard constraints
- `agents/` — autonomous role agents (audit, coding, trunk, UI, TDD, a11y, debt)
- `prompts/` — operational slash commands and invocation stubs
- `instructions/` — scoped always-on instruction overlays
- `workflow/` — PR template variants

---

## Compatibility matrix

Columns: `coding` TypeScript implementation · `audit` compliance/quality review · `trunk` git/PR workflow · `docs` JSDoc/documentation · `react` React/UI · `a11y` accessibility · `debt` tech-debt management · `tdd` test-first development.

### Always-on root

| File | coding | audit | trunk | docs | react | a11y | debt | tdd | Set |
|------|:------:|:-----:|:-----:|:----:|:-----:|:----:|:----:|:---:|-----|
| `copilot-instructions.md` | ✓ | ✓ | ✓ | ✓ | — | — | — | — | **active** |

### Agents (`agents/`)

| File | coding | audit | trunk | docs | react | a11y | debt | tdd | Set |
|------|:------:|:-----:|:-----:|:----:|:-----:|:----:|:----:|:---:|-----|
| `coding-guarded.agent.md` | ✓ | — | — | ✓ | — | — | — | — | **active** |
| `tdd-workflow.agent.md` | ✓ | — | — | — | — | — | — | ✓ | **active** |
| `audit-techdebt-docs.agent.md` | — | ✓ | — | ✓ | — | — | ✓ | — | **active** |
| `ui-functional-react.agent.md` | ✓ | — | — | ✓ | ✓ | ✓ | — | — | **active** |
| `git-trunk-enforcer.agent.md` | — | — | ✓ | — | — | — | — | — | **active** |
| `git-trunk-bot.agent.md` | — | — | ✓ | — | — | — | — | — | **active** |
| `debt-curator.agent.md` | — | ✓ | — | — | — | — | ✓ | — | **active** |
| `ui-a11y-render-review.agent.md` | — | ✓ | — | — | ✓ | ✓ | — | — | **active** |

`trunk-enforcer` and `trunk-bot` are complementary, not duplicates: the enforcer orchestrates workflow gates; trunk-bot executes git operations via `scripts/trunk.sh`.

### Prompts (`prompts/`)

Full prompts carry standalone executable instructions. Stubs are thin invocation shims that delegate to a canonical agent.

| File | coding | audit | trunk | docs | react | a11y | debt | tdd | Kind | Set |
|------|:------:|:-----:|:-----:|:----:|:-----:|:----:|:----:|:---:|------|-----|
| `git-start-work.prompt.md` | — | — | ✓ | — | — | — | — | — | full | **active** |
| `git-checkpoint.prompt.md` | — | — | ✓ | — | — | — | — | — | full | **active** |
| `git-sync.prompt.md` | — | — | ✓ | — | — | — | — | — | full | **active** |
| `git-open-pr.prompt.md` | — | — | ✓ | — | — | — | — | — | full | **active** |
| `git-hotfix.prompt.md` | — | — | ✓ | — | — | — | — | — | full | **active** |
| `git-feature-lifecycle.prompt.md` | — | — | ✓ | — | — | — | — | — | full | **active** |
| `module-new-module.prompt.md` | ✓ | — | — | ✓ | — | — | — | — | full | **active** |
| `audit-projects.prompt.md` | — | ✓ | — | ✓ | — | — | ✓ | — | full | **active** |
| `audit-techdebt-docs.prompt.md` | — | ✓ | — | ✓ | — | — | ✓ | — | stub → `audit-techdebt-docs.agent.md` | **active** |
| `coding-guarded-agent.prompt.md` | ✓ | — | — | — | — | — | — | — | stub → `coding-guarded.agent.md` | **active** |
| `debt-curator.prompt.md` | — | ✓ | — | — | — | — | ✓ | — | stub → `debt-curator.agent.md` | **active** |
| `git-trunk-ops.prompt.md` | — | — | ✓ | — | — | — | — | — | stub → `git-trunk-bot.agent.md` | **active** |

`audit-projects.prompt.md` is distinct from the audit agent: it targets the full workspace across all packages, while the agent targets a specific file or selection.

### Instructions (`instructions/`)

Always-on overlays applied by glob pattern.

| File | coding | audit | trunk | docs | react | a11y | debt | tdd | Set |
|------|:------:|:-----:|:-----:|:----:|:-----:|:----:|:----:|:---:|-----|
| `coding-typescript.instructions.md` | ✓ | — | — | — | — | — | — | — | **active** |
| `docs-commenting.instructions.md` | — | ✓ | — | ✓ | — | — | ✓ | — | **active** |
| `git-workflow.instructions.md` | — | — | ✓ | — | — | — | — | — | **active** |
| `coding-prelude.instructions.md` | ✓ | — | — | — | — | — | — | — | **active** |
| `audit-comment-quality.instructions.md` | — | ✓ | — | ✓ | — | — | — | — | **active** |

### Workflow templates (`workflow/`)

| File | Set | Notes |
|------|-----|-------|
| `pull-request-template.extended.md` | **active** | Installed as `.github/PULL_REQUEST_TEMPLATE.md` |
| `pull-request-template.concise.md` | **active** | Lighter alternative; swap manually when preferred |

---

## Curation history

**Pass 1 — initial migration**

1. Imported from `tmp/github/` and normalized for repository layout.
2. Fixed broken `ìnstructions` path typo (Unicode accent on `i`) across all files.
3. Normalized stale `.github/agents/` and `.github/instructions/` cross-references.
4. Normalized all TSF++ spec references to `spec/CODING_STANDARD.md`.
5. Preserved both PR template variants under `workflow/`.

**Pass 2 — semantic deduplification**

Four near-duplicate (prompt, agent) pairs were found and resolved by converting redundant prompts to thin dispatch stubs:

| Prompt (stub) | Canonical agent | Overlap |
|---------------|-----------------|---------|
| `debt-curator.prompt.md` | `debt-curator.agent.md` | 95% identical body |
| `audit-techdebt-docs.prompt.md` | `audit-techdebt-docs.agent.md` | Thin excerpt of agent rules |
| `coding-guarded-agent.prompt.md` | `coding-guarded.agent.md` | 90% identical; agent is canonical |
| `git-trunk-ops.prompt.md` | `git-trunk-bot.agent.md` | Same commit/merge/push operations |

Stubs delegate fully to their canonical agent and add no new rules.

---

## Naming conventions

- Agent files: `<capability>.agent.md`
- Prompt files: `<workflow-or-task>.prompt.md`
- Instruction files: `<domain>.instructions.md`
- Workflow templates: `pull-request-template.<variant>.md`

---

## Recommended entry points

| Goal | Start here |
|------|-----------|
| Write new TypeScript code | `agents/coding-guarded.agent.md` |
| Add a feature with TDD | `agents/tdd-workflow.agent.md` |
| Audit a file for compliance + debt + docs | `agents/audit-techdebt-docs.agent.md` |
| Audit entire workspace | `prompts/audit-projects.prompt.md` |
| Scaffold a new module | `prompts/module-new-module.prompt.md` |
| Start a new branch | `prompts/git-start-work.prompt.md` |
| Full feature lifecycle | `prompts/git-feature-lifecycle.prompt.md` |
| Commit current work | `prompts/git-checkpoint.prompt.md` |
| Triage tech-debt reminders | `agents/debt-curator.agent.md` |
| Review React UI for a11y + render | `agents/ui-a11y-render-review.agent.md` |
| Build React UI | `agents/ui-functional-react.agent.md` |
