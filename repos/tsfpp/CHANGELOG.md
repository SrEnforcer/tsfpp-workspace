# Changelog

All notable changes to the TSF++ monorepo are documented in this file.

This root changelog covers cross-cutting changes: repository structure,
tooling, CI, and coordinated multi-package releases. Individual package
changelogs live in `packages/*/CHANGELOG.md`. The specification has its own
changelog at `spec/CHANGELOG.md`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows the policy documented in `docs/semver-policy.md`.

---

## [Unreleased]

_Changes staged but not yet released._

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
