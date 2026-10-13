# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [1.0.4] - 2026-10-14

### Changed

- Raised the `@tsfpp/eslint-config` **dev** dependency to `^2.0.0` (was `^1.0.3`), which adds the Rule 1.13 and 4.6 lint checks. Dev-only; no consumer-facing change.
- Widened the `@tsfpp/standard` dependency range to `^5.0.0` so the server serves the current ruleset, including Rule 1.15. This entry previously claimed `^2.0.0` while `package.json` had already moved to `^4.0.0` — the range has been raised twice since without the changelog following. Rule 1.15 is verified to parse into the rule index (75 rules, `level=MUST`).

### Fixed

- **The rule index was empty against the installed standard.** `buildRuleIndex()` returned 0 rules, 0 forbidden constructs and 0 patterns, so every rule query answered with nothing. `@tsfpp/prelude` 2.0.0 renamed the `Option` eliminator `getOrElse` to `getOrElseOption` and reused the bare name for the `Result` eliminator; this package kept calling `getOrElse` on `Option` values, which silently yielded the fallback. All 13 call sites in `rule-index.ts` and `package-reader.ts` now use `getOrElseOption`.
- **`list_forbidden` returned zero constructs.** The parser only understood a `## Never` bullet list that no spec file uses; it now parses the standard's `## 12 — Forbidden Constructs (Summary)` table.
- The lockfile is regenerated so it agrees with `package.json`; it had still pinned prelude 1.7.0 and standard 1.3.0.

### Testing

- Regression tests assert against the **installed** `@tsfpp/standard` rather than a fixture, and a `test` script plus a `ci.yml` (typecheck, lint, tests) now exist.

## [1.0.3] - 2026-07-24

### Changed

- Updated TSF++ internal dependency references to the current published releases, including `@tsfpp/eslint-config` 1.0.3.

## [1.0.2] - 2026-07-24

### Changed

- Updated TSF++ internal dependency references to the current published releases.

## [1.0.1] - 2026-05-29

### Updated

- Prelude updated, added explicit versions, `toObject` and `isDefined`

## [1.0.0] - 2026-05-28

### Added

- Initial implementation of @tsfpp/mcp-server.
- TSF++ rule indexing and MCP tool/resource registration.
- Strict TSF++ lint/typecheck/test setup.
- Release-please manifest configuration and workflow.
