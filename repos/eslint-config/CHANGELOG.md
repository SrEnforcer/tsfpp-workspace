# Changelog — @tsfpp/eslint-config

All notable changes to this package are documented in this file.
This file is managed by [release-please](https://github.com/googleapis/release-please).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows the policy documented in `docs/semver-policy.md`.

---

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
