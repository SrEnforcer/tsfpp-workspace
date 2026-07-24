# Changelog

All notable changes to the TSF++ umbrella repository are documented in this file.

This repository holds the project docs, integrations, and starter template.
The specification and the published packages live in their own sibling
repositories (`@tsfpp/standard`, `@tsfpp/prelude`, `@tsfpp/eslint-config`,
`@tsfpp/tsconfig`, `@tsfpp/workflow`), each with its own changelog.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows the policy documented in `docs/semver-policy.md`.

---

## [Unreleased]

### Removed

- Removed the stale vendored copies of `packages/prelude`, `packages/eslint-config`, `packages/tsconfig`, `spec/`, and `workflow/`. These duplicated (at older versions) the canonical sibling repositories; this repository is now the umbrella for docs and the starter template.
- Removed `integrations/copilot/` — a superseded, Ramda-era Copilot integration (referenced the removed `ramda.ts`, a non-existent "Rule 13.1", and old prelude API names). The canonical, current AI-assistant tooling lives in `@tsfpp/agents`, which compiles Copilot, Claude, and MCP output from universal `ai/` sources.

### Changed

- Migrated the two unique workflow guides (`conventional-commits.md`, `git-trunk-based.md`) into `docs/`.
- `templates/starter` now depends on the published `@tsfpp/*` packages instead of `workspace:*` links.
- Updated README, release-please config, and pnpm workspace to reflect the umbrella-only structure.

---

## [1.0.0] — 2026-05-05

### Added

- Initial public release of the TSF++ monorepo.
- `spec/` — canonical TSF++ coding standard, philosophy, rationale, and examples.
- `packages/@tsfpp/prelude` v1.0.0 — ADT helpers, `pipe`, `absurd`, `Result`, `Option`.
- `packages/@tsfpp/eslint-config` v1.0.0 — ESLint flat config enforcing core TSF++ rules.
- `packages/@tsfpp/tsconfig` v1.0.0 — strict TypeScript compiler presets (base / lib / app).
- `integrations/copilot/` — VS Code GitHub Copilot agents, prompts, and instructions.
- `workflow/` — trunk-based development guide and Conventional Commits reference.
- `templates/starter/` — minimal project scaffold for new TSF++ projects.
- `docs/` — getting-started guide, adoption guide, comparison, case studies, semver policy.
- `spec/DEVIATIONS.md` — project-wide deviation ledger template and worked examples.
- `.github/workflows/ci.yml` — typecheck, lint, test, and commitlint on every PR.
- `.github/workflows/release-please.yml` — automated release management via release-please.
- Issue templates for rule clarification, rule proposal, prelude bugs, and integration bugs.
