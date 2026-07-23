# Changelog — @tsfpp/tsconfig

All notable changes to this package are documented in this file.
This file is managed by [release-please](https://github.com/googleapis/release-please).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows the policy documented in `docs/semver-policy.md`.

---

## [1.0.0] — 2026-05-05

### Added

- `tsconfig.base.json` — shared strict compiler options (Rule 9.1 MUST flags):
  `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `useUnknownInCatchVariables`, `noPropertyAccessFromIndexSignature`,
  `verbatimModuleSyntax`, `isolatedModules`, `noImplicitReturns`,
  `noUnusedLocals`, `noUnusedParameters`.
- `tsconfig.lib.json` — extends base; targets `ESNext` module for published
  library packages (`declaration: true`, `declarationMap: true`,
  `sourceMap: true`).
- `tsconfig.app.json` — extends base; targets `ESNext` module for application
  code with `noEmit: true` (type-checking only; bundler handles emit).
