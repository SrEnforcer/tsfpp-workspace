# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### ⚠ BREAKING CHANGES

- **Uniform `mk` construction prefix (standard Rule 7.3 / 7.8).** All smart constructors now use the `mk` prefix; the `create*` factories and the unprefixed `*Error` constructors are renamed:
  - Handlers/adapters: `createHandler` → `mkHandler`, `createJsonHandler` → `mkJsonHandler`, `createNodeAdapter` → `mkNodeAdapter`
  - API errors: `notFoundError` → `mkNotFoundError`, `conflictError` → `mkConflictError`, `permissionError` → `mkPermissionError`, `unauthenticatedError` → `mkUnauthenticatedError`, `rateLimitError` → `mkRateLimitError`, `preconditionError` → `mkPreconditionError`, `goneError` → `mkGoneError`, `dependencyError` → `mkDependencyError`, `internalError` → `mkInternalError`
  - `validationError` is removed; use `mkValidationError` (previously the concrete-variant builder), which returns a `ValidationError` assignable to `ApiError`.
- **Prelude 2.0.0 dependency.** Bumped `@tsfpp/prelude` to `2.0.0`; the Option eliminator is now `getOrElseOption` (was `getOrElse`).

## [1.2.0] - 2026-05-20

### Added
- Added core boundary primitives and helper APIs.
- Added configuration boundary documentation and release prep updates.
- Added modular boundary exports for focused modules (`boundary-types`, `boundary-response`, `boundary-operations`, `boundary-idempotency`, `boundary-webhook`, `boundary-node`).
- Added handler helper APIs: `createHandler`, `createJsonHandler`, `parseJsonBody`, `parseJsonWithSchema`, `mkNextCursor`, and `parsePaginationFromRequest`.

### Changed
- Reworked the package surface from a monolithic `boundary.ts` implementation to a module-based barrel while preserving public exports.
- Updated README and RECIPES examples to current API forms (`mkProblem({ ... })`, helper-driven handler composition) and order/customer domain flows.

## [1.1.0] - 2026-05-18

### Added
- Added configuration boundary helpers: `loadConfig`, `EnvSchema<T>`, and `ConfigError`.
- Added configuration recipes and README docs for startup-time env validation.

## [1.0.1] - 2026-05-15

### Added
- Added package keywords in `package.json` for improved discoverability.

### Changed
- Replaced local coding-standard references with `@tsfpp/standard` links in docs.

### Removed
- Removed local `API_CODING_STANDARD.md` from this package.

## [1.0.0] - 2026-05-14

### Added
- Initial package scaffolding and public API surface for boundary primitives.
