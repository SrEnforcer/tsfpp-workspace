# Changelog — @tsfpp/prelude

All notable changes to this package are documented in this file.
This file is managed by [release-please](https://github.com/googleapis/release-please).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows the policy documented in `docs/semver-policy.md`.

---

## [1.0.0] — 2026-05-05

### Added

- `absurd` — exhaustiveness helper; narrows `never` at the default branch of
  every exhaustive `switch`.
- `pipe` — left-to-right function composition for up to 10 steps.
- `Option<A>` — tagged union `Some<A> | None` with `some`, `none`, `fromNullable`,
  `map`, `flatMap`, `getOrElse`, `fold`.
- `Result<T, E>` — tagged union `Ok<T> | Err<E>` with `ok`, `err`, `fromThrowable`,
  `map`, `mapErr`, `flatMap`, `fold`, `toOption`.
- `IO<A>` — deferred synchronous side-effect wrapper with `map`, `flatMap`, `run`.
- `Task<A>` — deferred `Promise<A>` wrapper with `map`, `flatMap`, `run`.
- `TaskResult<T, E>` — `Task<Result<T, E>>` alias with `map`, `mapErr`, `flatMap`.
- Re-exports of curated Ramda combinators via `@tsfpp/prelude/ramda` (Rule 13.1
  compliant; direct `ramda` imports are forbidden in consumer packages).
