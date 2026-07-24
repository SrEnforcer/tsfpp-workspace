# Changelog - @tsfpp/standard

All notable changes to this package are documented in this file.
This file is managed by [release-please](https://github.com/googleapis/release-please).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

## [2.0.0] - 2026-07-23

### ⚠ BREAKING CHANGES

- New MUST rules forbid previously-permitted constructs; adopter code compliant under 1.x may need changes. Per the SemVer policy documented for this standard (a rule change that can break adopters is a major bump), these ship as a major release, alongside `@tsfpp/prelude` 2.0.0 and `@tsfpp/boundary` 2.0.0.

### Added

- **Rule 1.13** — Numeric hazards: `NaN`/`Infinity` and coercion-based parsing forbidden in the core; brand constrained numerics (`Int`/`Positive`/`NonNegative`); guard finiteness at the boundary.
- **Rule 1.14** — Prefer `satisfies` over `as` for literal conformance.
- **Rule 4.6** — No ambient nondeterminism in the pure core (`Date.now`/`new Date`/`Math.random`/`crypto.randomUUID`/`performance.now`/`process.env` are effects — inject via `Deps`).
- **Rule 6.7** — Domain error channels must be `kind`-tagged discriminated unions, never bare `string`/`Error`.
- **Rule 7.8** — ADT-combinator naming: `Result` is the unsuffixed base; other ADTs are suffixed by full type name (`mapOption`, `headNonEmpty`); no abbreviated/single-letter forms.
- **Rule 8.5** — Consume `Option`/`Result` through a total `match` eliminator when both arms yield a value.
- Appendix B: `no-restricted-globals` / `no-restricted-syntax` enforcing Rules 1.13 and 4.6. Appendix E and the review checklist updated.

### Changed

- **Rule 7.3 tightened** — `mk` is the canonical smart-constructor prefix; `create*` is no longer sanctioned.
- Rationale (§1, §4, §6, §7, §8) and rule-by-rule examples added/updated for every new rule.

## [1.4.0] - 2026-05-18

### Added

- Added `spec/CONFIG_CODING_STANDARD.md` for typed configuration loading, validation, and injection rules.
- Added `spec/LOG_CODING_STANDARD.md` for structured logging, logger-port usage, and log safety constraints.

### Changed

- Updated `README.md` standards table and profile hierarchy to include TSF++/Config and TSF++/Log.
- Updated `spec/PHILOSOPHY.md` and `spec/RATIONALE.md` to include conceptual framing and rationale coverage for TSF++/Config and TSF++/Log.

## [1.2.0] - 2026-05-18

### Added

- Added `spec/ANNOTATION_CODING_STANDARD.md` defining annotation and comment governance.
- Added `spec/RATIONALE.md` outlining the choices and considerations behind the TSF++ standard family.

### Changed

- Updated `README.md` to document the latest standard set and refreshed references (including rationale and ecosystem tables).

## [1.1.0] - 2026-05-17

### Added

- `spec/TEST_CODING_STANDARD.md`.
- Companion coverage for Rules `1.10-1.12`, `2.5`, `6.6`, `7.7`, `8.4`, `9.6`, and Section `10.1-10.4`.
- New companion files: tooling and documentation/review examples and rationale.

### Changed

- Synced `spec/examples` and `spec/rationale` coverage with `CODING_STANDARD.md` v1.1.0 additions.
- Renumbered module-organisation example file to align with Section 11.
- Updated stale standard-path references across `spec/` docs and README tables.
- Repaired corrupted content in `spec/rationale/11-module-organisation.md`.

## [1.0.0] - 2026-05-14

### Added

- Initial package scaffold.
- Typed metadata helpers for standard documents and risk levels.
- TS build, lint, and test setup matching sibling TSF++ libraries.