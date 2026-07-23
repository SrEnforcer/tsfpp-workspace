# Changelog — @tsfpp/workflow

All notable changes to this package are documented in this file.
This file is managed by [release-please](https://github.com/googleapis/release-please).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

No changes yet.

## [1.0.0] - 2026-05-16

### Added

- Initial @tsfpp/workflow package release.
- `init.mjs` scaffolder that installs and updates workflow defaults for consuming projects.
- Conventional Commits setup via `commitlint.config.js` template.
- Husky hook templates for commit message validation and pre-commit checks.
- Release automation workflow template at `files/workflows/release-please.yml`.
- Interactive release-please config generation for single-package and pnpm workspace projects.