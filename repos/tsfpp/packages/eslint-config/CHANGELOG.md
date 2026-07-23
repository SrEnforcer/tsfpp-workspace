# Changelog — @tsfpp/eslint-config

All notable changes to this package are documented in this file.
This file is managed by [release-please](https://github.com/googleapis/release-please).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows the policy documented in `docs/semver-policy.md`.

---

## [1.0.0] — 2026-05-05

### Added

- Initial ESLint flat config (`index.js`) enforcing TSF++ rules via
  `@typescript-eslint` and `eslint-plugin-functional`.
- Enforced rules: 1.2, 1.5, 1.6, 1.9, 2.1–2.3, 3.1, 3.4, 4.1, 4.2, 4.5, 6.2
  (see `spec/rationale/09-tooling.md` for mapping).
- `no-explicit-any`, `no-non-null-assertion`, `consistent-type-assertions: never`
  enforcing Rules 1.5 and 1.6.
- `functional/immutable-data` and `functional/no-let` enforcing Rules 2.1–2.3.
- `functional/no-loop-statements` enforcing Rule 4.1.
- `functional/no-throw-statements` outside adapter boundaries (Rule 6.2).
