---
description: Extra-strict rules for the prelude package (reference library)
applyTo: "**/prelude/**/*.ts,**/prelude/*.ts"
---

# Prelude-specific guidance (TSF++ §13)

This package is the standard's reference library. It has the highest fan-in in the repository, so the bar is higher than for domain code. Canonical rules: `spec/CODING_STANDARD.md` §13, Appendix D.

## Non-negotiable for every export

1. **Laws in JSDoc.** Document identity, composition, associativity, unit, or whatever laws apply.
2. **Property tests with fast-check.** Every law in JSDoc has a corresponding `fc.assert(fc.property(...))` test.
3. **Curried, data-last.** `f(config)(data)`, never `f(data, config)`. This is the contract every pipeline depends on.
4. **Purity.** No I/O, no module-level mutable state, no `throw` outside `tryCatch`-style adapter helpers (`result.ts`).

## ADT shapes are fixed

- `Option<A>` has exactly `{ _tag: 'Some'; value: A } | { _tag: 'None' }`.
- `Result<E, A>` has exactly `{ _tag: 'Ok'; value: A } | { _tag: 'Err'; error: E }`.
- `Either<E, A>` is a type alias of `Result<E, A>`.

Do not introduce parallel ADTs with different tags or field names — downstream pattern matching would fragment.

## Dependencies

- Runtime: `ramda` only.
- Dev: `fast-check`, TypeScript, the test runner.
- Any new runtime dependency requires an entry in `DEVIATIONS.md` and team approval.

## Ramda surface is curated

`prelude/ramda.ts` is the only place `import from 'ramda'` is permitted. Add combinators as the codebase needs them, one at a time. Deliberately omitted and not to be added without discussion: `__`, `flip`, `curry`, `curryN`, `nAry` — these undermine point-free readability.

## Versioning

The prelude follows SemVer. A major bump is required for any of:

- A change to an ADT shape (tag names, field names, variant set).
- A change to a combinator's argument order or arity.
- A change to a documented algebraic law.

Prefer adding a new combinator over modifying an existing one. Deprecate via `@deprecated` JSDoc for at least one minor version before removal.

## Size budget

Keep the prelude under 500 LOC excluding tests. If it grows, split into submodules (`option`, `result`, `brand`, `lens`, `ramda`) rather than fattening the root.
