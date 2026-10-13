# Changelog — @tsfpp/eslint-config

All notable changes to this package are documented in this file.
This file is managed by [release-please](https://github.com/googleapis/release-please).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows the policy documented in `docs/semver-policy.md`.

---

## [Unreleased]

## [2.1.0] — 2026-10-14

### Added

- **ESLint 10 support.** All four profiles (`base`, `react`, `api`, `layered`) are verified against ESLint 10.12.0 and still work on ESLint 9. No rule was added, removed or changed in severity, so code that linted clean under 2.0.0 lints the same.
- **The React profile now runs on ESLint 10.** `eslint-plugin-react` 7.37.5 and `eslint-plugin-jsx-a11y` 6.10.2 have no ESLint 10 release; the former throws `contextOrFilename.getFilename is not a function` on the first linted file. Both are now registered through `coerceLegacyPlugin`, which applies `fixupPluginRules` from the new `@eslint/compat` dependency. Under ESLint 10 the package manager still warns about those two plugins' own `eslint` peer range.

### Changed

- **Peer ranges.** `eslint` is now `^9.0.0 || ^10.0.0` (was the open-ended `>=9.0.0`, which claimed majors nobody had tested), and `eslint-plugin-functional` is `^9.0.0 || ^10.0.0`. Under ESLint 10, `eslint-plugin-functional` 9.x needs at least 9.0.5.
- **`engines.node` is now `^20.19.0 || ^22.13.0 || >=24`** (was `>=18.18.0`), matching ESLint 10 and `@eslint/compat` 2.x. Node 18 reached end of life in April 2025.
- Development dependencies moved to ESLint 10.12.0, typescript-eslint 8.71.2, `eslint-plugin-functional` 10.0.1 and `@tanstack/eslint-plugin-query` 5.104.2.

## [2.0.0] — 2026-10-14

### ⚠ BREAKING CHANGES

- **The base preset now enforces the Appendix B checks for Rules 1.13 and 4.6**, which standard Rule 9.2 requires and the preset lacked. Code that previously linted clean fails until it injects the dependency or carries a `DEVIATION` comment:
  - Rule 4.6 — `Date.now()`, `Math.random()` and `process.env` are reported via `no-restricted-syntax` (`new Date()` was already caught under Rule 1.9).
  - Rule 1.13 — the coercing globals `isNaN`, `isFinite`, `parseInt` and `parseFloat` are reported via `no-restricted-globals`.

### Fixed

- **`pnpm lint` failed, and had been linting build output.** The `lint` script targeted `dist/`, so ESLint read the emitted JavaScript — which carries the sources' `eslint-disable` comments — under a config that registers no plugins. Every directive resolved to `Definition for rule '@typescript-eslint/consistent-type-assertions' was not found`. It now lints the TypeScript sources and ignores `dist/`.
- **The one permitted `as` in `plugin-compat.ts` was unguarded.** Its `eslint-disable-next-line` sat above the function signature while the assertion is on the following line, so the directive covered the wrong line. Nothing caught it because the rule was never enforced against the sources. The directive now sits immediately above the assertion and carries its `DEVIATION(1.6)` reason inline.
- **`release-please-manifest.json` was missing entirely.** The release workflow passes `manifest-file: release-please-manifest.json`, so release-please had no version baseline and never cut a release — which is why 1.1.0 sits in `package.json` while npm still serves 1.0.3, and why `@tsfpp/agents` 2.5.0 declares a peer dependency on `>=1.1.0` that cannot be satisfied. The manifest now records the published 1.0.3 as the baseline.

### Added

- **CI.** This package had no workflow other than release-please: nothing built, linted, or smoke-imported it on push or pull request. The new `ci.yml` runs build, lint and test, and the config now enforces its own Rule 1.6 setting (`consistent-type-assertions: never`) against its sources.

## [1.1.0] — 2026-07-25

### Features

- add the **`@tsfpp/eslint-config/layered`** profile enforcing standard Rules 11.5 (layer boundaries — functional core, imperative shell) and 11.6 (import purity):
  - `no-restricted-imports` zones stopping `core`/`domain` and `use-case` modules from importing adapters, transports, `node:*`, or frameworks — the error message points at Rule 6.5's port-and-inject remedy.
  - `no-restricted-syntax` for module-level side effects: clock reads, `process.env`, top-level `await`, and bare calls at module scope.
  - Verified against a fixture: catches all five violation shapes and stays silent on compliant code.

## [1.0.3] — 2026-07-24

### Changed

- Updated package metadata for the next publish after downstream dependency bumps.

## [1.0.2] — 2026-07-24

### Changed

- Updated package metadata for the next publish after dependency reference bumps.

## [1.0.1] — 2026-05-15

### Changed

- Updated package documentation in `README.md`.

### Chore

- Added `.gitignore` to ignore build and local artifacts.
- Bumped package version to `1.0.1`.

## [1.0.0] — 2026-05-05

### Added

- Initial release of `@tsfpp/eslint-config` with flat config presets for:
  base TypeScript projects, React projects, and API/server projects.
- Rule coverage aligned to TSF++ coding standards across type safety,
  immutability, control flow, error handling, and complexity constraints.
- Published package exports for `.` (base), `./react`, and `./api` profiles.
- Peer dependency model for ESLint 9 + TypeScript 5.3+ with optional React,
  accessibility, and TanStack Query plugin support.
- End-user documentation covering installation, profile selection, usage
  patterns, and sanctioned TSF++ deviation boundaries.
