# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.2.0] - 2026-11-08

### Fixed

- **Zod 4 compatibility.** `fromZodError` read `zodError.errors`, which Zod 4 removed, so with Zod 4 every refused body in `parseJsonWithSchema` / `mkJsonHandler` threw a `TypeError` (a 500) instead of answering 422. It now reads `issues` (Zod 4, and Zod 3, which has both) and falls back to `errors`. `JsonSchema`, `EnvSchema` and `fromZodError` share the new `SchemaError` type, whose path segments may be symbols as Zod 4 types them; `loadConfig` no longer needs an adapter for a Zod 4 schema. Verified against `zod@4.6.7`.

### Features

- add **`parseWith`**, **`parseQuery`** and **`queryOf`** (`boundary-parse`): parse path parameters, query strings or any value through a schema into `Result<T, ValidationError>`, the shape `parseJsonWithSchema` gives a body.
- add **`withIdempotency(store, { required: true })`**: a retryable write without an `Idempotency-Key` is refused with 400 `idempotency_key_required` before the handler runs. The default is unchanged.
- add **`parseAcceptLanguage`**, **`preferredLanguage`** and **`contentLanguageHeader`** (`boundary-language`): RFC 9110 language negotiation against the application's own locale constructor.
- add the client side (`boundary-client`): **`fetchJson`** over an injected `FetchPort`, **`readJsonResponse`**, **`parseProblemDetails`** and the **`ClientFailure`** union (`offline`, `unauthenticated`, `problem` with parsed `ProblemDetails`, `malformed`).
- add **`withResultCache`** (`boundary-cache`): an in-memory TTL cache of a Result-returning source's successes, with an injected clock and a capacity.
- add **`runMain`** and **`MainFailure`** (`boundary-node`): a script's exit code from its `Result`, so scripts carry no exit-code mutation of their own.
- add **`mkFieldError(field, issue)`**, plus the `SchemaIssue` / `SchemaError` types and the `schemaIssues`, `pathText` and `fieldOfPath` helpers.
- 28 new tests (`boundary.additions.test.ts`), property-based for `queryOf` round-trips and `Accept-Language` ordering; suite now **49**.

Extracted from patterns proven in a consuming application (civi). Uses only `@tsfpp/prelude` 2.0.x APIs, so the `^2.0.0` range stands.

### Changed

- Raised the `@tsfpp/eslint-config` **dev** dependency to `^2.0.0` (was `^1.0.3`), which adds the Rule 1.13 and 4.6 lint checks. Dev-only; no consumer-facing change.
- Widened the `@tsfpp/standard` **dev** dependency to `^5.0.0` (was `^4.0.0`, which the caret excluded from 5.0.0). Dev-only, so this carries no consumer-facing change and deliberately does **not** warrant a release of its own — it rides along with the next boundary release. The runtime `@tsfpp/prelude` range `^2.0.0` already admits 2.4.0, so the new `NonEmptyReadonlyArray` combinators are available to this package without a republish.

## [2.1.0] - 2026-07-25

### Testing

- add a **`fast-check` property-based law suite** (`boundary.laws.test.ts`) satisfying standard Rule 8.2, which this package previously violated without a recorded deviation. Covers the cursor codec round-trip (`decodeCursor ∘ encodeCursor ≡ Some(identity)`, base64url output shape, and totality on arbitrary text), branded smart-constructor predicate agreement (`mkTraceId`, `mkPrincipalId`, `mkWebhookEventId`, `mkIdempotencyKey`), and `parsePaginationQuery` bounds over generated input. Suite: 21 tests.

### Changed

- Loosened the `@tsfpp/prelude` runtime dependency to `^2.0.0` (was an exact `2.0.2` pin) so patch/minor prelude releases no longer require a boundary republish.
- Widened the `@tsfpp/standard` dev dependency range to `^2.0.0` (was `^1.4.0`, which the caret excluded from 2.0.0).

## [2.0.2] - 2026-07-24

### Changed

- Updated internal TSF++ dependency references to the current published releases, including `@tsfpp/eslint-config` 1.0.3.

## [2.0.1] - 2026-07-24

### Changed

- Updated internal TSF++ dependency references to the current published releases.

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
