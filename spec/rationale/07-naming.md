# Rationale: §7 — Naming

Covers Rules 7.1–7.7 in [CODING_STANDARD.md](../CODING_STANDARD.md).

---

## Rule 7.7 — Name effectful wrappers with `with`

Wrapper functions have a characteristic shape: they accept a handler/effectful function and return another function with the same interface but extra behavior (logging, timing, retries, idempotency, tracing).

The `with` prefix makes this shape obvious at call sites:

```typescript
const wrapped = withRetry(3, withLogging('sync-users', handler))
```

This reads as layered behavior in execution order. Names like `decorate`, `apply`, or `add` are less specific and hide wrapper intent.

The convention also improves review quality. A reviewer can scan for `withX` wrappers and reason quickly about cross-cutting concerns and composition order.

---

## Rule 7.8 — ADT-combinator suffixes

The prelude is a flat module: `map`, `mapOption`, and `mapList` all sit in the same namespace, because the standard forbids `namespace` (Rule 1.9) and does not require importing each ADT as a qualified module the way fp-ts does (`O.map`, `E.map`). That flatness buys ergonomics — one import site, no aliasing — at the cost of needing the *name* to carry the disambiguation that a module path would otherwise carry.

The failure this rule prevents is a real one that shipped in earlier prelude versions: the "base" ADT drifted between families. `map` and `flatMap` were `Result`; but `getOrElse` was `Option` while the `Result` version was `getOrElseR`; and `match` was split as `matchResult` / `matchOption` with neither unsuffixed. A reader could not answer "what does the bare name mean?" because the answer changed per function. Worse, a caller reaching for the `Result` `getOrElse` would land on the `Option` one, and only a type error (if they were lucky) would tell them.

**Why `Result` as the base.** Two ADTs were candidates for the privileged unsuffixed slot: `Result` and `Option`. `Result` wins because fallible, effectful computation is the dominant shape in application and boundary code — the combinators written most often — and because the effect pipeline (`pipe(x, map(f), flatMap(g))`) reads best without noise. `Option` is common too, but it is frequently a *step inside* a `Result` computation rather than the top-level currency, so paying the suffix on `Option` combinators costs less in aggregate.

**Why full names, not letters.** `mapO` saves three characters and forfeits predictability: `O` could be Option, or the first letter of an operation, or an output type. `mapOption` is unambiguous and greppable — a reviewer can find every Option map with a single search, which the abbreviated form defeats. The same argument retires `headNE` in favour of `headNonEmpty`.

**What is out of scope.** The rule governs ADT-parametric *combinators*. It deliberately does not touch data constructors (`some`, `ok`, `cons`), which are named for the variant they build; type guards (`isSome`, Rule 7.5); or conversions that already name their endpoints (`fromArray`, `toArray`, `fromNullable`). Those families have their own conventions and are already consistent.
